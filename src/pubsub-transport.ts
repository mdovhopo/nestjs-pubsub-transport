import { Message, PubSub, Subscription, Topic } from '@google-cloud/pubsub';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import errorToJSON from 'error-to-json';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { Logger } from 'winston';

export const PubSubTransportConfig = Symbol('PubSubTransportConfig');
export type PubSubTransportConfig =
  | {
      pubsub?: undefined;
      topic?: undefined;
      subscription: Subscription;
      ackDeadline?: number;
      maxMessages?: number;
      getPattern?: (msg: Message) => string;
      deserializeMessage?: (msg: Message) => any;
      ackIfNoHandler?: boolean;
      logger?: Logger;
    }
  | {
      pubsub?: undefined;
      topic: Topic;
      subscription: string;
      ackDeadline?: number;
      maxMessages?: number;
      getPattern?: (msg: Message) => string;
      deserializeMessage?: (msg: Message) => any;
      ackIfNoHandler?: boolean;
      logger?: Logger;
    }
  | {
      pubsub: PubSub;
      topic: string;
      subscription: string;
      ackDeadline?: number;
      maxMessages?: number;
      getPattern?: (msg: Message) => string;
      deserializeMessage?: (msg: Message) => any;
      ackIfNoHandler?: boolean;
      logger?: Logger;
    };

@Injectable()
export class PubSubTransport extends Server implements CustomTransportStrategy {
  readonly topic?: Topic;
  readonly subscription: Subscription;
  readonly pubSub?: PubSub;

  private readonly getPattern: (msg: Message) => string;
  private readonly deserializeMessage: (msg: Message) => any;
  private ackIfNoHandler: boolean;

  constructor(
    @Inject(PubSubTransportConfig)
    {
      topic,
      subscription,
      ackDeadline,
      maxMessages,
      deserializeMessage,
      getPattern,
      pubsub,
      ackIfNoHandler,
    }: PubSubTransportConfig,
    @Optional()
    @Inject(WINSTON_MODULE_PROVIDER)
    private log?: Logger
  ) {
    super();
    // kind of ugly logic to no to force user pass pubsub and topic, if they
    // already have Subscription object
    if (typeof subscription === 'string') {
      if (typeof topic === 'string') {
        if (!pubsub) {
          throw new TypeError('pubsub is required, if subscription is a string');
        }
        this.pubSub = pubsub;
        this.topic = pubsub.topic(topic);
      } else {
        this.topic = topic;
      }
      if (!this.topic) {
        throw new TypeError(`topic is required, if subscription is a string`);
      }
      this.subscription = this.topic.subscription(subscription, {
        ackDeadline: ackDeadline || 10, // in seconds
        flowControl: { maxMessages: maxMessages || 1000 },
      });
    } else {
      this.subscription = subscription;
    }

    this.getPattern = getPattern || ((msg) => msg.attributes.operationId);
    this.deserializeMessage = deserializeMessage || ((msg) => JSON.parse(msg.data.toString()));
    this.ackIfNoHandler = ackIfNoHandler || false;
  }

  listen(callback: () => void): void {
    this.log?.debug('Listening for PubSub messages...');
    this.subscription.on('close', () => {
      this.log?.error('PubSub subscription closed unexpectedly');
      this.log?.close();
      process.exit(3);
    });
    this.subscription.on('message', (msg: Message) => this.handleMessage(msg));
    callback();
  }

  async handleMessage(message: Message): Promise<void> {
    const pattern = this.getPattern(message);
    const body = this.deserializeMessage(message);

    const handler = this.getHandlerByPattern(pattern);

    let error: Error | undefined;

    if (!handler) {
      if (this.ackIfNoHandler) {
        return message.ack();
      }
      error = new Error(`Handler not found for pattern: ${pattern}`);
    } else {
      const observable = await handler(body);
      if (observable) {
        error = await firstValueFrom(observable);
      } else {
        this.log?.warn(
          `Your handler did not return Observable, maybe you forgot to use PubSubInterceptor for your controller?`
        );
      }
    }

    if (!error) {
      message.ack();
      this.log?.info(
        `Processed ${pattern} message #${message.id} on attempt #${message.deliveryAttempt}`,
        {
          type: 'audit',
          deliveryAttempt: message.deliveryAttempt,
          operation: pattern,
          requestBody: body,
          requestId: message.id,
        }
      );
    } else {
      message.nack();
      this.log?.error(
        `Error processing ${pattern} message #${message.id} on attempt #${message.deliveryAttempt}`,
        {
          type: 'audit',
          deliveryAttempt: message.deliveryAttempt,
          operation: pattern,
          requestBody: body,
          requestId: message.id,
          error: errorToJSON(error),
        }
      );
    }
  }

  async close(): Promise<void> {
    // this.log.info('Closing PubSub...');
    this.subscription.removeAllListeners('close');
    this.subscription.removeAllListeners('message');
    /**
     * subscription.close() does not wait until inflight messages are processed.
     * we have two kinds of inflight messages:
     * 1. messages that are fetched from pubsub and queued internally:
     *    those messages will be removed from the queue but they already have received an ack.
     *    it will take 10 seconds until those messages will become available for consumption.
     *    see https://github.com/googleapis/nodejs-pubsub/issues/725
     * 2. messages that our worker works on (messageHandler was called but promise is still resolving)
     *    those messages will be interrupted. as soon as 1 is fixed,
     *    we could keep track of in progress messages and wait in close until all of them are done
     */
    await this.subscription.close();
    await this.pubSub?.close();
    // this.log.info('PubSub closed');
  }
}
