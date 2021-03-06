/*
 * JBoss, Home of Professional Open Source
 * Copyright 2012 Red Hat Inc. and/or its affiliates and other contributors
 * as indicated by the @authors tag. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Project list is collection of project entities.
 * This collection is typically initiated at the application start and then used during application life cycle.
 *
 * @author lvlcek@redhat.com (Lukas Vlcek)
 */

goog.provide('org.jboss.search.list.Project');

goog.require('goog.array');
goog.require('goog.async.Deferred');
goog.require('goog.object');
goog.require('goog.string');



/**
 * Creates a new instance of Project list.
 * @param {!goog.async.Deferred} deferred source that will provide the actual data
 * @param {Function=} opt_canceller A function that will be called if the
 *     deferred is cancelled.
 * @param {Object=} opt_defaultScope The default scope to call callbacks with.
 * @constructor
 * @extends {goog.async.Deferred}
 */
org.jboss.search.list.Project = function(deferred, opt_canceller, opt_defaultScope) {
  goog.async.Deferred.call(this, opt_canceller, opt_defaultScope);

  /**
   * @type {!goog.async.Deferred}
   * @private
   */
  this.deferred_ = deferred;

  /**
   * {
   *     project_id: project_name,
   *     ...
   *     'hibernatesearch': 'Hibernate Search'
   * }
   *
   * @type {Object.<string, string>}
   * @private
   */
  this.map_ = {};

  // when deferred has the results, parse them, keep them in the map and let the callee know.
  this.deferred_.addCallback(function(data) {
    this.map_ = this.parseProjectData(data);
    this.callback();
  }, this);
};
goog.inherits(org.jboss.search.list.Project, goog.async.Deferred);


/**
 * Knows how to parse response from {@see Constants.API_URL_PROJECT_LIST_QUERY}
 * into simple map representation.
 * @param {!Object} json
 * @return {!Object}
 */
org.jboss.search.list.Project.prototype.parseProjectData = function(json) {
  this.checkFailedResponse(json);
  var map_ = {};
  var hits = goog.object.getValueByKeys(json, 'hits', 'hits');
  if (goog.isDef(hits) && goog.isArray(hits)) {
    goog.array.forEach(hits, function(hit) {
      var fields = goog.object.getValueByKeys(hit, 'fields');
      if (goog.isObject(fields)) {
        var id_ = goog.object.getValueByKeys(fields, 'sys_project');
        var name_ = goog.object.getValueByKeys(fields, 'sys_project_name');
        if (goog.isDefAndNotNull(id_)) {
          if (goog.isDefAndNotNull(name_)) {
            map_[id_] = name_;
          } else {
            // fallback (no project name found for the code)
            map_[id_] = id_;
          }
        }
      }
    }, this);
  }
  return map_;
};


/**
 *
 * @param {!Object} json
 */
org.jboss.search.list.Project.prototype.checkFailedResponse = function(json) {
  // TODO: {@see org.jboss.search.list.Type}.
};


/**
 * Return Project Name for given Project ID.
 * @param {!string} sysId
 * @return {!string}
 */
org.jboss.search.list.Project.prototype.getSysProjectName = function(sysId) {
  return goog.object.get(this.map_, sysId, 'Unknown').valueOf();
};


/**
 * Return projects as a map.
 * @return {Object.<string, string>}
 */
org.jboss.search.list.Project.prototype.getMap = function() {
  return this.map_;
};


/**
 * Return projects as an array.
 * Returned array is ordered ascending by the lower-cased 'name' value.
 * @return {!Array.<{name: string, code: string, orderBy: string}>}
 */
org.jboss.search.list.Project.prototype.getArray = function() {
  /** @type {!Array.<{name: string, code: string, orderBy: string}>} */ var result = new Array();
  goog.object.forEach(this.map_, function(value, key) {
    var name = (goog.string.isEmptySafe(value) ? key : value);
    result.push({'name': name, 'code': key, 'orderBy': name.toLowerCase()});
  });
  goog.array.sortObjectsByKey(result, 'orderBy');
  return result;
};
