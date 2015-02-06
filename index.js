/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2015 eBay Software Foundation                               │
 │                                                                            │
 │  Licensed under the Apache License, Version 2.0 (the "License");           │
 │  you may not use this file except in compliance with the License.          │
 │  You may obtain a copy of the License at                                   │
 │                                                                            │
 │    http://www.apache.org/licenses/LICENSE-2.0                              │
 │                                                                            │
 │  Unless required by applicable law or agreed to in writing, software       │
 │  distributed under the License is distributed on an "AS IS" BASIS,         │
 │  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │  See the License for the specific language governing permissions and       │
 │  limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
import Path from 'path';
import shush from 'shush';
import caller from 'caller';
import debuglog from 'debuglog';
import Thing from 'core-util-is';
import Common from './lib/common';
import Factory from './lib/factory';
import Provider from './lib/provider';


const debug = debuglog('confit');

function conditional(fn) {
    return function (store) {
        try {
            return fn(store);
        } catch (err) {
            if (err.code && err.code === 'MODULE_NOT_FOUND') {
                debug('WARNING:', err.message);
                return store;
            }
            throw err;
        }
    }
}

export default function confit(options = {}) {
    if (Thing.isString(options)) {
        options = { basedir: options };
    }

    // ¯\_(ツ)_/¯ ... still normalizing
    options.defaults = options.defaults || 'config.json';
    options.basedir = options.basedir || Path.dirname(caller());
    options.protocols = options.protocols || {};


    let factory = new Factory(options);

    factory.promise = factory.promise
        .then(store => Common.merge(Provider.argv(), store))
        .then(store => Common.merge(Provider.env(), store))
        .then(store => Common.merge(Provider.convenience(), store))
        .then(conditional(store => {
            let file = Path.join(options.basedir, options.defaults);
            return Common.merge(shush(file), store)
        }))
        .then(conditional(store => {
            let file = Path.join(options.basedir, store.env.env + '.json');
            return Common.merge(shush(file), store);
        }));

    return factory;
}