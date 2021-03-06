# Frontend - search.jboss.org

Upcoming new version of search frontend for <http://search.jboss.org> (work in progress!).

### Build from the source code

#### Development - quick build

To get non-minified and non-optimized version run

    $ cd searchPage
    $ ./quickBuild.sh

and follow the instructions.

#### Production - slower build

To get highly minified and optimized version run:

    $ mvn clean package
    
To get build that is tailored specifically for production environment use maven **production profile**: 

    $ mvn clean package -Pproduction
    
This changes index.html file to use **resources prefix**. By default its value is: `//static.jboss.org/${app.name}/${release.version}/`.
Where the variables can be setup using mvn properties: 

- `app.name` (default: `search-beta`)
- `release.version` (default: `1.0`)

For example:

    $ mvn clean package -Pproduction -Dapp.name=search -Drelease.version=1.3
    
will result in **resources prefix**: `//static.jboss.org/search/1.3/`
    
To omit **resource prefix** at all use `-Dabsolute.server.path=` like:
    
    $ mvn clean package -Pproduction -Dabsolute.server.path=
    
By default `production` profile skips all tests and performs advanced compilation only for the very last processed module.
If you want to execute tests use the following:    
    
    $ mvn clean package -Pproduction -DskipTests=false -Dmaven.test.skip=false

### For Developers

Instructions for [developers](docs/developer.md).

### For Designers

Instructions for [designers](docs/designer.md).

### License

[Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0)

### Copyright

    JBoss, Home of Professional Open Source
    Copyright 2012 Red Hat Inc. and/or its affiliates and other contributors
    as indicated by the @authors tag. All rights reserved.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.