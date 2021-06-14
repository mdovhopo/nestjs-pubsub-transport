# nestjs-pubsub-transport

[![Deploy](https://github.com/mdovhopo/nestjs-pubsub-transport/workflows/build/badge.svg)](https://github.com/mdovhopo/nestjs-pubsub-transport/actions)
[![Coverage Status](https://coveralls.io/repos/github/mdovhopo/nestjs-pubsub-transport/badge.svg?branch=master)](https://coveralls.io/github/mdovhopo/nestjs-pubsub-transport?branch=master)

Custom transport for Google PubSub for NestJS framework

Installation:

```sh
npm i nestjs-pubsub-transport
```

## Examples

### install module

 ```ts
 @Module({
  imports: [
    PubsubTransportModule.forRootAsync({
      inject: [],
      useFactory: () => ({
        topic: 'topic-name',
        subscription: 'subscription-name',
        ackDeadline: 10, // optional
        maxMessages: 10, // optional
        getPattern: (msg: Message) => msg.attributes.yourPattern, // optional
        deserializeMessage: (msg: Message) => msg.data,
      }),
    }),
    SomeModule,
  ],
})
export class AppModule {
}
 ```

 ```ts
 @Module({
  imports: [
    PubsubTransportModule.forRoot({
      topic: 'topic-name',
      subscription: 'subscription-name',
      ackDeadline: 10, // optional
      maxMessages: 10, // optional
      getPattern: (msg: Message) => msg.attributes.yourPattern, // optional
      deserializeMessage: (msg: Message) => msg.data,
    }),
    SomeModule,
  ],
})
export class AppModule {
}
 ```

### Controller example

```ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PubSubInterceptor } from 'nestjs-pubsub-transport';

// Use interceptor, to correctly catch errors, otherwise transport will always 'ack' message
@UseInterceptors(PubSubInterceptor)
@Controller()
export class ClientsController {
  constructor() {
  }

  @MessagePattern('pattern')
  authorize(@Payload() data: AuthorizeClientMessage) {
    console.log('handle message', data);
  }
}
```

### Connect transport as microservice

```ts
  // connect pubsub transport
app.connectMicroservice({
  strategy: app.get(PubSubTransport),
});
```

### Start transport

```ts
  await app.startAllMicroservicesAsync();
```

Bootstrapped with: [create-ts-lib-gh](https://github.com/glebbash/create-ts-lib-gh)

This project is [Mit Licensed](LICENSE).
