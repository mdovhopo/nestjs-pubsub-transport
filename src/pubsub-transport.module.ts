import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';

import { PubSubTransport, PubSubTransportConfig } from './pubsub-transport';

export interface PubSubTransportAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<PubSubTransportConfig>;
  useClass?: Type<PubSubTransportConfig>;
  useValue?: PubSubTransportConfig;
  useFactory?: (...args: any[]) => Promise<PubSubTransportConfig> | PubSubTransportConfig;
  inject?: any[];
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
   *        deserializeMessage: (msg: Message) => msg.data,
   *     ),
   *     SomeModule,
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: PubSubTransportConfig): DynamicModule {
    return PubsubTransportModule.forRootAsync({
      useValue: options,
    });
  }

  /**
   * Example:
   * ```
   * @Module({
   *   imports: [
   *     PubsubTransportModule.forRootAsync({
   *       inject: [],
   *       useFactory: () => ({
   *        topic: 'topic-name',
   *        subscription: 'subscription-name',
   *        ackDeadline: 10, // optional
   *        maxMessages: 10, // optional
   *        getPattern: (msg: Message) => msg.attributes.yourPattern, // optional
   *        deserializeMessage: (msg: Message) => msg.data,
   *       }),
   *     ),
   *     SomeModule,
   *   ],
   * })
   * export class AppModule {}
   * ```
   */

  static forRootAsync(options: PubSubTransportAsyncOptions): DynamicModule {
    const { imports = [], useClass, useFactory, useExisting, inject } = options;
    return {
      module: PubsubTransportModule,
      global: true,
      imports,
      providers: [
        {
          inject,
          useClass,
          useFactory,
          useExisting,
          provide: PubSubTransportConfig,
        },
      ],
      exports: [PubSubTransport],
    };
  }
}
