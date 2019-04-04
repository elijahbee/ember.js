import { getOwner, setOwner } from '@ember/-internals/owner';
import { get, set, observer } from '@ember/-internals/metal';
import CoreObject from '../../lib/system/core_object';
import { moduleFor, AbstractTestCase, buildOwner } from 'internal-test-helpers';

moduleFor(
  'Ember.CoreObject',
  class extends AbstractTestCase {
    ['@test throws an error with new (one arg)']() {
      expectAssertion(() => {
        new CoreObject({
          firstName: 'Stef',
          lastName: 'Penner',
        });
      }, /You may have either used `new` instead of `.create\(\)`/);
    }

    ['@test throws an error with new (> 1 arg)']() {
      expectAssertion(() => {
        new CoreObject(
          {
            firstName: 'Stef',
            lastName: 'Penner',
          },
          {
            other: 'name',
          }
        );
      }, /You may have either used `new` instead of `.create\(\)`/);
    }

    ['@test tunnels the owner through to the base constructor'](assert) {
      assert.expect(2);

      let owner = {};
      let props = {
        someOtherProp: 'foo',
      };

      setOwner(props, owner);

      class Route extends CoreObject {
        constructor() {
          super(...arguments);
          assert.equal(
            getOwner(this),
            owner,
            'owner was assigned properly in the root constructor'
          );
          assert.equal(this.someOtherProp, undefined, 'other props were not yet assigned');
        }
      }

      Route.create(props);
    }

    ['@test toString should be not be added as a property when calling toString()'](assert) {
      let obj = CoreObject.create({
        firstName: 'Foo',
        lastName: 'Bar',
      });

      obj.toString();

      assert.notOk(
        obj.hasOwnProperty('toString'),
        'Calling toString() should not create a toString class property'
      );
    }

    ['@test should not trigger proxy assertion when retrieving a proxy with (GH#16263)'](assert) {
      let someProxyishThing = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      let obj = CoreObject.create({
        someProxyishThing,
      });

      let proxy = get(obj, 'someProxyishThing');
      assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');
    }

    ['@test should not trigger proxy assertion when retrieving a re-registered proxy (GH#16610)'](
      assert
    ) {
      let owner = buildOwner();

      let someProxyishThing = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      // emulates ember-engines's process of registering services provided
      // by the host app down to the engine
      owner.register('thing:one', someProxyishThing, { instantiate: false });

      assert.equal(owner.lookup('thing:one'), someProxyishThing);
    }

    ['@test should not trigger proxy assertion when probing for a "symbol"'](assert) {
      let proxy = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');

      // should not trigger an assertion
      getOwner(proxy);
    }

    ['@test can use getOwner in a proxy init GH#16484'](assert) {
      let owner = {};
      let options = {};
      setOwner(options, owner);

      CoreObject.extend({
        init() {
          this._super(...arguments);
          let localOwner = getOwner(this);

          assert.equal(localOwner, owner, 'should be able to `getOwner` in init');
        },
        unknownProperty() {
          return undefined;
        },
      }).create(options);
    }

    ['@test observed properties are enumerable when set GH#14594'](assert) {
      let callCount = 0;
      let Test = CoreObject.extend({
        myProp: null,
        anotherProp: undefined,
        didChangeMyProp: observer('myProp', function() {
          callCount++;
        }),
      });

      let test = Test.create();
      set(test, 'id', '3');
      set(test, 'myProp', { id: 1 });

      assert.deepEqual(Object.keys(test).sort(), ['id', 'myProp']);

      set(test, 'anotherProp', 'nice');

      assert.deepEqual(Object.keys(test).sort(), ['anotherProp', 'id', 'myProp']);

      assert.equal(callCount, 1);
    }
  }
);
