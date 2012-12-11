/*
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
*/

/**
 * @fileoverview Constants used all over the place.
 *
 * @author Lukas Vlcek (lvlcek@redhat.com)
 */
goog.provide('org.jboss.search.Constants');

org.jboss.search.Constants = {

    /**
     * HTTP GET request type.
     * @type {string}
     * @const
     */
    GET: "GET",

    /**
     * Used as an identified to abort or/and send the search suggestions request.
     * @type {string}
     * @const
     */
    SEARCH_SUGGESTIONS_REQUEST_ID: "1",

    /**
     * Used as an identified to abort or/and send the search results request.
     * @type {string}
     * @const
     */
    SEARCH_RESULTS_REQUEST_ID: "2",

    /**
     * Priority of search suggestions requests. If should be higher then search requests.
     * @type {number}
     * @const
     */
    SEARCH_SUGGESTIONS_REQUEST_PRIORITY: 10,

    /**
     * Used in CSS.
     * @type {string}
     * @const
     */
    HIDDEN: "hidden",

    /**
     * Used in CSS.
     * @type {string}
     * @const
     */
    SELECTED:"selected",

    /**
     * Temporary: URL of Apiary Mock Server
     * @type {string}
     * @const
     */
    API_URL_SUGGESTIONS_QUERY: "http://private-5ebf-jbossorg.apiary.io/v1/rest/suggestions/query_string"

};