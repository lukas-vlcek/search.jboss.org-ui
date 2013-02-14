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

goog.provide('org.jboss.search.App');

goog.require('org.jboss.search.page.element.Status');
goog.require('org.jboss.search.page.SearchPage');
goog.require('org.jboss.search.util.FragmentParser');
goog.require('org.jboss.search.suggestions.event.EventType');
goog.require('org.jboss.search.Constants');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.net.XhrManager');
goog.require('goog.net.XhrManager.Event');
goog.require('goog.net.XhrManager.Request');
goog.require('goog.Disposable');
goog.require('goog.History');

goog.require('goog.debug.Logger');

// Added to get rid of advanced compilation errors - Closure dependencies are broken ?
goog.require('goog.net.XhrLite');
/*
 If LoggingWindow.js is not included in the compilation then
 the following require() is used to get rid of compilation error
 [Goog.ERROR]: JSC_TYPE_PARSE_ERROR. Bad type annotation. Unknown type goog.debug.ErrorHandle ...
 ... closure-library/closure/goog/events/events.js line 896 : 11

 Correct solution is described here:
 http://code.google.com/p/closure-library/wiki/FrequentlyAskedQuestions
 */
goog.require('goog.debug.ErrorHandler');

/**
 * Constructor of the JBoss Search Application.
 * @constructor
 * @extends {goog.Disposable}
 */
org.jboss.search.App = function() {

    goog.Disposable.call(this);

    // init Status window (consider doing it earlier)
    var status_window = /** @type {!HTMLDivElement} */ (goog.dom.getElement('status_window'))
    var status = new org.jboss.search.page.element.Status(status_window);
    status.show('Initialization...');

    var log = goog.debug.Logger.getLogger('org.jboss.search.App');
    log.info("Search App initialization...");

    // ================================================================
    // A shortcut
    // ================================================================
    var const_ = org.jboss.search.Constants;

    // ================================================================
    // Get necessary HTML elements
    // ================================================================

    var query_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('query_field'));
    var spinner_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('query_field_div_spinner'));
    var clear_query_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('query_field_div_x'));
    var query_suggestions_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('search_suggestions'));

    var date_filter_body_div    = /** @type {!HTMLDivElement} */ (goog.dom.getElement('date_filter'));
    var project_filter_body_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('project_filter'));
    var author_filter_body_div  = /** @type {!HTMLDivElement} */ (goog.dom.getElement('author_filter'));

    var project_filter_query_field = /** @type {!HTMLInputElement} */ (goog.dom.getElement('project_filter_query_field'));
    var author_filter_query_field  = /** @type {!HTMLInputElement} */ (goog.dom.getElement('author_filter_query_field'));

    var second_filters_row_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('second_filters_row'));

    var date_filter_tab_div    = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('date', second_filters_row_div));
    var author_filter_tab_div  = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('author', second_filters_row_div));
    var project_filter_tab_div = /** @type {!HTMLDivElement} */ (goog.dom.getElementByClass('project', second_filters_row_div));

    var search_results_div = /** @type {!HTMLDivElement} */ (goog.dom.getElement('search_results'));

    status.setProgressValue(0.3);

    // ================================================================
    // Define internal variables and objects
    // ================================================================

    // get our window
//    var window_ = window || goog.dom.getWindow(goog.dom.getOwnerDocument(query_field));
    var history = new goog.History();

    var fragmentParser = new org.jboss.search.util.FragmentParser();

    /** @type {!goog.net.XhrManager} */
    var xhrManager = new goog.net.XhrManager();
    var searchPageContext = goog.getObjectByName('document');

    /**
     * Sets given query string to URL fragment.
     * Basically, this function is called by the search page; whenever user selects or input search query this function
     * gets called. It changes URL fragment and thus calls navigatorController.
     *
     * @param query_string value to be set to URL fragment, the value is encoded first!
     */
    var urlSetFragmentFunction = function(query_string) {
        history.setToken("q=" + goog.string.urlEncode(query_string));
    };

    status.setProgressValue(0.6);

    var searchPageElements = new org.jboss.search.page.SearchPageElements(
        query_field, spinner_div, clear_query_div, query_suggestions_div,
        date_filter_tab_div, project_filter_tab_div, author_filter_tab_div,
        date_filter_body_div, project_filter_body_div, author_filter_body_div,
        project_filter_query_field, author_filter_query_field,
        search_results_div
    );

    if (!searchPageElements.isValid()) {
        throw new Error('Missing some HTML elements!');
    }

    var searchPage = new org.jboss.search.page.SearchPage(
        xhrManager,
        searchPageContext,
        urlSetFragmentFunction,
        searchPageElements
    );

    status.setProgressValue(0.9);

    // navigation controller
    var navigationController = function (e) {
        // e.isNavigate (true if value in browser address bar is changed manually)
        log.info('Navigated to state "' + e.token + '"');
        var query = fragmentParser.getUserQuery(e.token);
        if (goog.isDef(query)) {
            searchPage.runSearch(query);
        }
    };

    // activate URL History manager
    this.historyListenerId_ = goog.events.listen(history, goog.history.EventType.NAVIGATE, navigationController);
    history.setEnabled(true);

    status.setProgressValue(1);
    // TODO experiment
    this.finish_ = goog.events.listen(searchPage, org.jboss.search.suggestions.event.EventType.SEARCH_FINISH, function(){
        goog.dom.classes.add(spinner_div, const_.HIDDEN);
    });

    this.start_ = goog.events.listen(searchPage, org.jboss.search.suggestions.event.EventType.SEARCH_START, function(){
        goog.dom.classes.remove(spinner_div, const_.HIDDEN);
    });

    status.hide();
    status.setProgressValue(0);
};
goog.inherits(org.jboss.search.App, goog.Disposable);

/** @inheritDoc */
org.jboss.search.App.prototype.disposeInternal = function() {
    org.jboss.search.App.superClass_.disposeInternal.call(this);
    goog.events.unlistenByKey(this.historyListenerId_);
    goog.events.unlistenByKey(this.finish_);
    goog.events.unlistenByKey(this.start_);
};