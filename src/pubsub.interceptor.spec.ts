import { of } from 'rxjs';

import { errorTransformer, PubSubInterceptor } from './pubsub.interceptor';

describe('PubSubInterceptor', () => {
  test('errorTransformer', (done) => {
    const err = new Error('oops');
    errorTransformer(err).subscribe((data) => {
      expect(data).toBe(err);
      done();
    });
  });
  it('works', () => {
    new PubSubInterceptor().intercept(undefined as any, { handle: () => of(0) });
  });
});
