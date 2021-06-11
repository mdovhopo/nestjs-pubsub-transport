import { Message, PubSub } from '@google-cloud/pubsub';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { createLogger, transports } from 'winston';

import { PubSubTransport, PubSubTransportConfig } from './pubsub-transport';
import { PubsubTransportModule } from './pubsub-transport.module';

describe('PubSubTransport', () => {
  const logger = createLogger({
    transports: [new transports.Console()],
  });

  const logInfoSpy = jest.spyOn(logger, 'info').mockReturnThis();
  const logErrorSpy = jest.spyOn(logger, 'error').mockReturnThis();

  const subscriptionMock = {
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const topicMock = {
    subscription: jest.fn().mockReturnValue(subscriptionMock),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const pubSubMock = {
    topic: jest.fn().mockReturnValue(topicMock),
    close: jest.fn().mockResolvedValue(undefined),
  };
  let pubSubService: PubSubTransport;

  const config: PubSubTransportConfig = {
    topic: 'topic',
    subscription: 'subscription',
    pubsub: pubSubMock as unknown as PubSub,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    pubSubService = new PubSubTransport(config, logger);
  });

  it('bootstraps module', async () => {
    await Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRootAsync({
          inject: [],
          useFactory: () => ({
            pubsub: config.pubsub,
            topic: 'topic',
            subscription: 'sub',
          }),
        }),
      ],
    }).compile();
  });

  it('creates topic and subscription', async () => {
    expect(pubSubService).toBeDefined();
  });

  it('listens to pubsub messages', async () => {
    jest.spyOn(process, 'exit').mockReturnValue(0 as never);
    subscriptionMock.on.mockImplementation((event, handler) => {
      if (event === 'close') {
        handler();
      } else if (event === 'message') {
        handler({
          attributes: { operationId: 'operationId' },
          data: '{}',
          nack: jest.fn(),
        });
      } else {
        throw new Error(`Unknown event: ${event}`);
      }
    });

    const cb = jest.fn();
    pubSubService.listen(cb);
    expect(cb).toBeCalled();
  });

  it('handles incoming messages', async () => {
    const message = new Message({} as any, {
      ackId: 'ackId',
      message: {
        messageId: 'messageId',
        data: Buffer.from('{ "a": 1 }'),
        attributes: { operationId: 'operationId' },
      },
      deliveryAttempt: 1,
    });
    const ackSpy = jest.spyOn(message, 'ack').mockReturnValue();

    const handler = jest.fn().mockResolvedValue(of(undefined));

    pubSubService.addHandler('operationId', handler);

    await pubSubService.handleMessage(message);

    expect(handler).toBeCalled();
    expect(ackSpy).toBeCalled();
    expect(logInfoSpy).toBeCalled();
  });

  it('acks message if no handler and ackIfNoHandler enabled', async () => {
    const transport = new PubSubTransport({ ...config, ackIfNoHandler: true }, logger);
    const message = new Message({} as any, {
      ackId: 'ackId',
      message: {
        messageId: 'messageId',
        data: Buffer.from('{ "a": 1 }'),
        attributes: { operationId: 'operationId' },
      },
      deliveryAttempt: 1,
    });
    const ackSpy = jest.spyOn(message, 'ack').mockReturnValue();

    await transport.handleMessage(message);

    expect(ackSpy).toBeCalled();
  });

  it('nacks unhandled messages', async () => {
    const message = new Message({} as any, {
      ackId: 'ackId',
      message: {
        messageId: 'messageId',
        data: Buffer.from('{ "a": 1 }'),
        attributes: { operationId: 'operationId' },
      },
      deliveryAttempt: 1,
    });
    const nackSpy = jest.spyOn(message, 'nack').mockReturnValue();

    await pubSubService.handleMessage(message);

    expect(nackSpy).toBeCalled();
    expect(logErrorSpy).toBeCalled();
  });

  it('closes', async () => {
    await pubSubService.close();
  });
});
