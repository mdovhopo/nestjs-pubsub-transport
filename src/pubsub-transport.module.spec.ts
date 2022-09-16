import type { PubSub } from '@google-cloud/pubsub';
import { Test } from '@nestjs/testing';

import { PubSubTransport, PubSubTransportConfig, PubsubTransportModule } from '..';

describe('PubsubTransportModule', () => {
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

  const config: PubSubTransportConfig = {
    topic: 'topic',
    subscription: 'subscription',
    pubsub: pubSubMock as unknown as PubSub,
  };

  it('bootstraps module (async)', async () => {
    const app = await Test.createTestingModule({
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

    expect(app.get(PubSubTransport)).toBeDefined();
  });

  it('bootstraps module with a custom logger', async () => {
    const loggerToken = Symbol('MockLogger');
    const mockLogger = {
      log: () => ({}),
    };

    const app = await Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRootAsync({
          logger: loggerToken,
          providers: [{ provide: loggerToken, useValue: mockLogger }],
          useFactory: () => ({
            pubsub: config.pubsub,
            topic: 'topic',
            subscription: 'sub',
          }),
        }),
      ],
    }).compile();

    const transport = app.get(PubSubTransport);
    expect(transport).toBeDefined();
    expect((transport as never as Record<string, unknown>)['log']).toBe(mockLogger);
  });

  it('bootstraps two modules using symbol token (async)', async () => {
    const serviceA = Symbol('ServiceA');
    const serviceB = Symbol('ServiceB');
    const app = await Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRootAsync({
          inject: [],
          useFactory: () => ({
            pubsub: config.pubsub,
            topic: 'topic',
            subscription: 'sub',
          }),
          token: serviceA,
        }),
        PubsubTransportModule.forRootAsync({
          inject: [],
          useFactory: () => ({
            pubsub: config.pubsub,
            topic: 'topic',
            subscription: 'sub',
          }),
          token: serviceB,
        }),
      ],
    }).compile();

    expect(app.get(serviceA)).toBeDefined();
    expect(app.get(serviceB)).toBeDefined();
  });

  it('bootstraps module (sync)', async () => {
    const app = await Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRoot({
          pubsub: config.pubsub,
          topic: 'topic',
          subscription: 'sub',
        }),
      ],
    }).compile();

    expect(app.get(PubSubTransport)).toBeDefined();
  });

  it('accepts subscription object', async () => {
    const app = await Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRoot({
          pubsub: config.pubsub,
          topic: 'topic',
          subscription: subscriptionMock as never,
        }),
      ],
    }).compile();

    expect(app.get(PubSubTransport)).toBeDefined();
  });

  it('fails if pubsub is not defined', async () => {
    const bootstrapPromise = Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRoot({
          pubsub: undefined as never,
          topic: 'topic',
          subscription: 'sub',
        }),
      ],
    }).compile();

    expect(bootstrapPromise).rejects.toThrowError(
      new TypeError('pubsub is required, if subscription is a string')
    );
  });

  it('fails if topic is not defined', async () => {
    const bootstrapPromise = Test.createTestingModule({
      imports: [
        PubsubTransportModule.forRoot({
          pubsub: config.pubsub,
          topic: undefined as never,
          subscription: 'sub',
        }),
      ],
    }).compile();

    expect(bootstrapPromise).rejects.toThrowError(
      new TypeError('topic is required, if subscription is a string')
    );
  });
});
