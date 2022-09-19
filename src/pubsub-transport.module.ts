import { DynamicModule, Logger, Module, ModuleMetadata, Provider, Type } from '@nestjs/common';

import { LoggerToken, PubSubTransport, PubSubTransportConfig } from './pubsub-transport';

export interface PubSubTransportLogger {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

export const defaultLogger: PubSubTransportLogger = {
  debug: Logger.debug,
  info: Logger.log,
  error: Logger.error,
  warn: Logger.warn,
};

export interface PubSubTransportAsyncOptions extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  useExisting?: Type<PubSubTransportConfig>;
  useClass?: Type<PubSubTransportConfig>;
  useFactory?: (...args: any[]) => Promise<PubSubTransportConfig> | PubSubTransportConfig;
  inject?: any[];
  token?: symbol;
  logger?: boolean | Type<PubSubTransportLogger>;
}

@Module({})
export class PubsubTransportModule {
  /**
   * Example:
   * ```js
   * @Module({
   *   imports: [
   *     PubsubTransportModule.forRoot({
   *        topic: 'topic-name',
   *        subscription: 'subscription-name',
   *        ackDeadline: 10, // optional
   *        maxMessages: 10, // optional
   *        getPattern: (msg: Message) => msg.attributes.yourPattern, // optional
   *        deserializeMessage: (msg: Message) => msg.data, // optional
   *     ),
   *     SomeModule,
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: PubSubTransportConfig): DynamicModule {
    return PubsubTransportModule.forRootAsync({
      useFactory: () => options,
    });
  }

  /**
   * Example:
   * ```
   * @Module({
   *   imports: [
   *     PubsubTransportModule.forRootAsync({
   *       inject: [PubSub],
   *       useFactory: () => ({
   *        pubsub: pubSub,
   *        topic: 'topic-name',
   *        subscription: 'subscription-name',
   *        ackDeadline: 10, // optional
   *        maxMessages: 10, // optional
   *        getPattern: (msg: Message) => msg.attributes.yourPattern, // optional
   *        deserializeMessage: (msg: Message) => msg.data, // optional
   *       }),
   *     ),
   *     SomeModule,
   *   ],
   * })
   * export class AppModule {}
   * ```
   */

  static forRootAsync(options: PubSubTransportAsyncOptions): DynamicModule {
    const {
      imports = [],
      useClass,
      useFactory,
      useExisting,
      inject,
      token,
      providers,
      logger,
    } = options;

    return {
      module: PubsubTransportModule,
      global: true,
      imports,
      providers: [
        ...(providers || []),
        {
          inject,
          useClass,
          useFactory,
          useExisting,
          provide: PubSubTransportConfig,
        },
        ...getLoggerProviderDefinition(logger),
        token
          ? {
              useClass: PubSubTransport,
              provide: token,
            }
          : PubSubTransport,
      ],
      exports: [token || PubSubTransport],
    };
  }
}

function getLoggerProviderDefinition(
  logger?: boolean | Type<PubSubTransportLogger>
): [Provider] | [] {
  if (logger === false || logger === undefined) {
    return [];
  }

  if (logger === true) {
    return [{ provide: LoggerToken, useValue: defaultLogger }];
  }

  return [{ provide: LoggerToken, useExisting: logger }];
}
