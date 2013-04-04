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
 *  @fileoverview Object represents the main search page.
 *  @author Lukas Vlcek (lvlcek@redhat.com)
 */

goog.provide('org.jboss.search.page.SearchPage');

goog.require('org.jboss.search.LookUp');
goog.require('org.jboss.search.util.urlGenerator');
goog.require('org.jboss.search.request');
goog.require('org.jboss.search.response');
goog.require('org.jboss.search.page.templates');
goog.require('org.jboss.search.page.SearchPageElements');
goog.require('org.jboss.search.page.UserIdle');
goog.require('org.jboss.search.Constants');
goog.require('org.jboss.search.page.element.SearchFieldHandler');
goog.require('org.jboss.search.suggestions.query.view.View');
goog.require('org.jboss.search.suggestions.event.EventType');
goog.require('org.jboss.search.page.event.QuerySubmitted');

goog.require('goog.async.Delay');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyEvent');
goog.require('goog.events.EventType');
goog.require('goog.events.EventTarget');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.Uri');

goog.require('goog.debug.Logger');

/**
 * @param {EventTarget|goog.events.EventTarget} context element to catch click events and control behaviour of the UI. Typically, this is the document.
 * @param {!org.jboss.search.page.SearchPageElements} elements HTML elements required by the search page
 * @constructor
 * @extends {goog.events.EventTarget}
 */
org.jboss.search.page.SearchPage = function(context, elements) {

    goog.events.EventTarget.call(this);

    var thiz_ = this;

    /** @private */ this.log_ = goog.debug.Logger.getLogger('SearchPage');

    /**
     * @private
     * @type {org.jboss.search.page.SearchPageElements} */
    this.elements_ = elements;

    /**
     * @private
     * @type {!goog.net.XhrManager} */
    this.xhrManager_ = org.jboss.search.LookUp.getInstance().getXhrManager();

    /** @private */ this.context = context;

    /** @private */ this.query_suggestions_view_ = new org.jboss.search.suggestions.query.view.View(this.elements_.getQuery_suggestions_div());
    /** @private */ this.query_suggestions_model = {};


    /**
     * @type {?number}
     * @private
     */
    this.xhrReadyListenerId_ = goog.events.listen(this.xhrManager_, goog.net.EventType.READY, function(e) {
        thiz_.dispatchEvent(org.jboss.search.suggestions.event.EventType.SEARCH_START);
    });

    /**
     * @type {?number}
     * @private
     */
    this.xhrCompleteListenerId_ = goog.events.listen(this.xhrManager_, goog.net.EventType.COMPLETE, function(e) {
        thiz_.dispatchEvent(org.jboss.search.suggestions.event.EventType.SEARCH_FINISH);
    });

    /**
     * @type {?number}
     * @private
     */
    this.xhrErrorListenerId_ = goog.events.listen(this.xhrManager_, goog.net.EventType.ERROR, function(e) {
        thiz_.dispatchEvent(org.jboss.search.suggestions.event.EventType.SEARCH_FINISH);
    });

    /**
     * @type {?number}
     * @private
     */
    this.xhrAbortListenerId_ = goog.events.listen(this.xhrManager_, goog.net.EventType.ABORT, function(e) {
        thiz_.dispatchEvent(org.jboss.search.suggestions.event.EventType.SEARCH_FINISH);
    });

    this.query_suggestions_view_.setClickCallbackFunction(
        function() {
            var selectedIndex = thiz_.query_suggestions_view_.getSelectedIndex();
            thiz_.hideAndCleanSuggestionsElementAndModel_();
            thiz_.elements_.getQuery_field().focus();

            (function(selectedIndex) {
                // TODO get query_string from model at the selectedIndex position
                thiz_.dispatchEvent(new org.jboss.search.page.event.QuerySubmitted("option was selected by pointer (index: "+selectedIndex+")"));

            })(selectedIndex);
        }
    );

    var suggestionsCallback = function(query_string) {

        if (goog.string.isEmptySafe(query_string)) {

            thiz_.hideAndCleanSuggestionsElementAndModel_();

        } else {

            // Abort does not send any event (because of the 'true')
            // so technically, we should fire our own SEARCH_FINISH event but because
            // we are immediately starting a new search we do not do it.
            thiz_.xhrManager_.abort(org.jboss.search.Constants.SEARCH_SUGGESTIONS_REQUEST_ID, true);
            thiz_.xhrManager_.send(
                org.jboss.search.Constants.SEARCH_SUGGESTIONS_REQUEST_ID,
//                "../../test/resources/suggestions_response.json",
                // setting the parameter value clears previously set value (that is what we want!)
                thiz_.getSuggestionsUri().setParameterValue("q",query_string).toString(),
                org.jboss.search.Constants.GET,
                "", // post_data
                {}, // headers_map
                org.jboss.search.Constants.SEARCH_SUGGESTIONS_REQUEST_PRIORITY,

                // callback, The only param is the event object from the COMPLETE event.
                function(e) {
                    var event = /** @type goog.net.XhrManager.Event */ (e);
                    if (event.target.isSuccess()) {
                        var response = event.target.getResponseJson();
                        // We are taking the response from the mock server for now,
                        // just replace the token with an actual query string.
                        response['view']['search']['options'] = [query_string];
                        response['model']['search']['search']['query'] = query_string;

                        var model = /** @type {!Object} */ (goog.object.get(response, "model", {}));
                        thiz_.query_suggestions_model = thiz_.parseQuerySuggestionsModel_(model);

                        if (goog.object.containsKey(response, "view")) {
                            var view = /** @type {!Object} */ (goog.object.get(response, "view", {}));

                            thiz_.query_suggestions_view_.update(view);
                            thiz_.query_suggestions_view_.show();

                        } else {
                            thiz_.hideAndCleanSuggestionsElementAndModel_();
                        }
                    } else {
                        // We failed getting query suggestions
                        thiz_.hideAndCleanSuggestionsElementAndModel_();
                    }

                }
            );
        }
    };

    /**
     * @type {?number}
     * @private
     */
    this.dateClickListenerId_ = goog.events.listen(this.elements_.getDate_filter_tab_div(),
        goog.events.EventType.CLICK,
        function() {
            thiz_.isDateFilterExpanded_() ? thiz_.collapseDateFilter_() : thiz_.expandDateFilter_()
        }
    );

    /**
     * @type {?number}
     * @private
     */
    this.projectClickListenerId_ = goog.events.listen(this.elements_.getProject_filter_tab_div(),
        goog.events.EventType.CLICK,
        function() {
            thiz_.isProjectFilterExpanded_() ? thiz_.collapseProjectFilter_() : thiz_.expandProjectFilter_()
        }
    );

    /**
     * @type {?number}
     * @private
     */
    this.authorClickListenerId_ = goog.events.listen(this.elements_.getAuthor_filter_tab_div(),
        goog.events.EventType.CLICK,
        function() {
            thiz_.isAuthorFilterExpanded_() ? thiz_.collapseAuthorFilter_() : thiz_.expandAuthorFilter_()
        }
    );

    /**
     * @type {?number}
     * @private
     */
    this.contextClickListenerId_ = goog.events.listen(
        thiz_.context,
        goog.events.EventType.CLICK,
        function(/** @type {goog.events.Event} */ e) {

//            thiz_.log_.info("Context clicked: " + goog.debug.expose(e));

            // if search field is clicked then do not hide search suggestions
            if (e.target !== thiz_.elements_.getQuery_field()) {
                thiz_.hideAndCleanSuggestionsElementAndModel_();
            }

            // if date filter (sub)element is clicked do not hide date filter
            if (e.target !== thiz_.elements_.getDate_filter_tab_div() &&
                !goog.dom.contains(thiz_.elements_.getDate_filter_body_div(), e.target)) {
                thiz_.collapseDateFilter_();
            }

            // if project filter (sub)element is clicked do not hide project filter
            if (e.target !== thiz_.elements_.getProject_filter_tab_div() &&
                !goog.dom.contains(thiz_.elements_.getProject_filter_body_div(), e.target)) {
                thiz_.collapseProjectFilter_();
            }

            // if author filter (sub)element is clicked do not hide author filter
            if (e.target !== thiz_.elements_.getAuthor_filter_tab_div() &&
                !goog.dom.contains(thiz_.elements_.getAuthor_filter_body_div(), e.target)) {
                thiz_.collapseAuthorFilter_();
            }

        });

    /**
     * This listener can catch events when the user navigates to the query field by other means then clicking,
     * for example by TAB key or by selecting text in the field by cursor (does not fire click event).
     * We want to hide filter tabs in such case.
     * @type {?number}
     * @private
     */
    this.query_field_focus_id_ = goog.events.listen(this.elements_.getQuery_field(),
        goog.events.EventType.INPUT,
        function(){
            thiz_.collapseAllFilters();
        }
    );

    /** @private */
    this.userQuerySearchField_ = new org.jboss.search.page.element.SearchFieldHandler(
        this.elements_.getQuery_field(),
        100,
        suggestionsCallback,
        null,
        this.getPresetKeyHandlers_()
    );


    /**
     * ID of listener which catches user clicks (click stream) on top of search results.
     * @type {?number}
     * @private
     */
    this.searchResultsClickId_ = goog.events.listen(
        this.elements_.getSearch_results_div(),
        goog.events.EventType.MOUSEUP,
        function(/** @type {goog.events.Event} */ e) {
            var element = e.target;
            while (element) {
                if (goog.dom.classes.has(element, org.jboss.search.Constants.CLICK_STREAM_CLASS)) {
                    var hitNumber = element.getAttribute(org.jboss.search.Constants.HIT_NUMBER);
                    if (hitNumber) {
                        try { hitNumber = +hitNumber } catch(err) { /* ignore */ }
                        if (goog.isNumber(hitNumber)) {
                            var d = org.jboss.search.LookUp.getInstance().getRecentQueryResultData();
                            var clickedHit = d && d.hits && d.hits.hits && d.hits.hits[hitNumber];
                            if (clickedHit) {
                                var _id = clickedHit._id;
                                var uuid = d.uuid;
                                if (_id && uuid) {
                                    org.jboss.search.request.writeClickStreamStatistics(thiz_.getUserClickStreamUri(), uuid, _id);
                                }
                            }
                        }
                    }
                    break;
                }
                element = goog.dom.getParentElement(element);
            }
        }
    );

    /**
     * ID of listener which catches mouse over events for contributor icons.
     * @type {?number}
     * @private
     */
    this.contributorMouseOverId_ = goog.events.listen(
        this.elements_.getSearch_results_div(),
        goog.events.EventType.MOUSEOVER,
        function(/** @type {goog.events.Event} */ e) {
            var element = e.target;
            while (element) {
                // When mouse is over small contributor avatar then do two things:
                // - change name to selected contributor
                // - change src of large avatar img on the left to search hit
                // (this is one nasty piece of code...)
                if (goog.dom.classes.has(element, org.jboss.search.Constants.CONTRIBUTOR_CLASS)) {
                    var hitNumber = element.getAttribute(org.jboss.search.Constants.HIT_NUMBER);
                    var contributorNumber = element.getAttribute(org.jboss.search.Constants.CONTRIBUTOR_NUMBER);
                    if (hitNumber && contributorNumber) {
                        // we have both values: hit number and contributor number
                        try {hitNumber = +hitNumber } catch(err) { /* ignore */ }
                        try {contributorNumber = +contributorNumber } catch(err) { /* ignore */ }
                        if (goog.isNumber(hitNumber) && goog.isNumber(contributorNumber)) {
                            // both are numbers, good...
                            var d = org.jboss.search.LookUp.getInstance().getRecentQueryResultData();
                            var currentHit = d && d.hits && d.hits.hits && d.hits.hits[hitNumber];
                            if (currentHit && currentHit.fields && currentHit.fields.dcp_contributors_view) {
                                var contributor = currentHit.fields.dcp_contributors_view[contributorNumber];
                                if (contributor) {
                                    // contributor data found in query response
                                    var contributorListElement = goog.dom.getParentElement(element);
                                    var nameElement = goog.dom.getElementByClass(
                                        "selected_contributor_name",
                                        contributorListElement
                                    );
                                    if (nameElement) {
                                        // Element holding the name of contributor found
                                        var valueElement = goog.dom.getElementByClass("value", nameElement);
                                        if (valueElement && valueElement != contributor.name) {
                                            goog.dom.setTextContent(
                                                valueElement,
                                                contributor.name
                                            );
                                        }
                                    }
                                    var hitElement = goog.dom.getParentElement(
                                        goog.dom.getParentElement(contributorListElement)
                                    );
                                    if (hitElement) {
                                        var leftElement = goog.dom.getElementByClass("left", hitElement);
                                        if (leftElement) {
                                            var avatarElement = goog.dom.getElementByClass("avatar", leftElement);
                                            if (avatarElement) {
                                                var avatarImg = goog.dom.getFirstElementChild(avatarElement);
                                                if (avatarImg) {
                                                    // img Element holding contributor large avatar found
                                                    var currentSRC = avatarImg.getAttribute("src");
                                                    if (currentSRC && currentSRC != contributor.gURL40) {
                                                        avatarImg.setAttribute("src", contributor.gURL40);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                }
                element = goog.dom.getParentElement(element);
            }
        }
    );

    /** @private */
    this.userIdle_ = new org.jboss.search.page.UserIdle(this.elements_.getSearch_results_div());

    /** @private */
    this.userIdleDelay_ = new goog.async.Delay(
        goog.bind(this.userIdle_.start,this.userIdle_),
        org.jboss.search.Constants.USER_IDLE_INTERVAL
    );

    this.userIdleDelay_.start();

};
goog.inherits(org.jboss.search.page.SearchPage, goog.events.EventTarget);

/** @inheritDoc */
org.jboss.search.page.SearchPage.prototype.disposeInternal = function() {

    // Call the superclass's disposeInternal() method.
    org.jboss.search.page.SearchPage.superClass_.disposeInternal.call(this);

    // Dispose of all Disposable objects owned by this class.
    goog.dispose(this.elements_);
    goog.dispose(this.userQuerySearchField_);
    goog.dispose(this.query_suggestions_view_);
    goog.dispose(this.userIdle_);
    goog.dispose(this.userIdleDelay_);

    // Remove listeners added by this class.
    goog.events.unlistenByKey(this.dateClickListenerId_);
    goog.events.unlistenByKey(this.projectClickListenerId_);
    goog.events.unlistenByKey(this.authorClickListenerId_);
    goog.events.unlistenByKey(this.contextClickListenerId_);
    goog.events.unlistenByKey(this.xhrReadyListenerId_);
    goog.events.unlistenByKey(this.xhrCompleteListenerId_);
    goog.events.unlistenByKey(this.xhrErrorListenerId_);
    goog.events.unlistenByKey(this.xhrAbortListenerId_);
    goog.events.unlistenByKey(this.query_field_focus_id_);
    goog.events.unlistenByKey(this.searchResultsClickId_);
    goog.events.unlistenByKey(this.contributorMouseOverId_);

    // Remove references to COM objects.

    // Remove references to DOM nodes, which are COM objects in IE.
    this.log_ = null;
    delete this.xhrManager_;
    this.context = null;
    this.query_suggestions_model = null;
};

/**
 * @return {goog.Uri} Search Suggestions Service URI
 */
org.jboss.search.page.SearchPage.prototype.getSuggestionsUri = function() {
    return this.SUGGESTIONS_URI_.clone();
};

/**
 * @return {goog.Uri} Query Search Service URI
 */
org.jboss.search.page.SearchPage.prototype.getSearchUri = function() {
    return this.SEARCH_URI_.clone();
};

/**
 * @return {goog.Uri} URI of service to record user click stream.
 */
org.jboss.search.page.SearchPage.prototype.getUserClickStreamUri = function() {
    return this.USER_CLICK_STREAM_URI_.clone();
};

/**
 * Set user query and execute the query.
 * @param {!string} query_string
 * @param {number=} opt_page
 * @param {string=} opt_log
 */
org.jboss.search.page.SearchPage.prototype.runSearch = function(query_string, opt_page, opt_log) {

    this.disposeUserEntertainment_();
    this.setUserQuery_(query_string);

    this.log_.info("User query [" + query_string + "]");

    this.xhrManager_.abort(org.jboss.search.Constants.SEARCH_QUERY_REQUEST_ID, true);
    this.disableSearchResults_();

    var query_url_string = org.jboss.search.util.urlGenerator.searchUrl(this.getSearchUri(), query_string, undefined, undefined, opt_page);

    if (query_url_string != null) {
        this.xhrManager_.send(
            org.jboss.search.Constants.SEARCH_QUERY_REQUEST_ID,
            // setting the parameter value clears previously set value (that is what we want!)
            query_url_string,
            org.jboss.search.Constants.GET,
            "", // post_data
            {}, // headers_map
            org.jboss.search.Constants.SEARCH_QUERY_REQUEST_PRIORITY,
            goog.bind(
                // callback, The only param is the event object from the COMPLETE event.
                function(e) {
                    var event = /** @type goog.net.XhrManager.Event */ (e);
                    if (event.target.isSuccess()) {
                        var response = event.target.getResponseJson();
//                        console.log("xhr response",response);
                        var data = org.jboss.search.response.normalizeSearchResponse(response, query_string, opt_page, opt_log);
//                        console.log("normalized data",data);
                        org.jboss.search.LookUp.getInstance().setRecentQueryResultData(data);
                        try {
                            var html = org.jboss.search.page.templates.search_results(data);
                            this.elements_.getSearch_results_div().innerHTML = html;
                        } catch(error) {
                            // Something went wrong when generating search results
                            // TODO fire event (with error)
                            this.log_.severe("Something went wrong",error);
                        }
                    } else {
                        // We failed getting search results data
                        org.jboss.search.LookUp.getInstance().setRecentQueryResultData(null);
                        var html = org.jboss.search.page.templates.request_error({
                            'user_query':query_string,
                            'error':event.target.getLastError()
                        });
                        this.elements_.getSearch_results_div().innerHTML = html;
                    }
                    this.enableSearchResults_();
                },
            this)
        );
    }
};

/**
 * Clear (remove) all search results from the screen.
 */
org.jboss.search.page.SearchPage.prototype.clearSearchResults = function() {
    // TODO: check if we need stop any listeners
    this.elements_.getSearch_results_div().innerHTML = '';
};

/**
 * Collapse all filter tabs.
 * @private
 */
org.jboss.search.page.SearchPage.prototype.collapseAllFilters = function() {
    if (this.isAuthorFilterExpanded_()) this.collapseAuthorFilter_();
    if (this.isProjectFilterExpanded_()) this.collapseProjectFilter_();
    if (this.isDateFilterExpanded_()) this.collapseDateFilter_();
};

/**
 * Prototype URI
 * @private
 * @type {goog.Uri}
 * @const
 */
org.jboss.search.page.SearchPage.prototype.SUGGESTIONS_URI_ = goog.Uri.parse(org.jboss.search.Constants.API_URL_SUGGESTIONS_QUERY);

/**
 * Prototype URI
 * @private
 * @type {goog.Uri}
 * @const
 */
org.jboss.search.page.SearchPage.prototype.SEARCH_URI_ = goog.Uri.parse(org.jboss.search.Constants.API_URL_SEARCH_QUERY);

/**
 * Prototype URI
 * @private
 * @type {goog.Uri}
 * @const
 */
org.jboss.search.page.SearchPage.prototype.USER_CLICK_STREAM_URI_ = goog.Uri.parse(org.jboss.search.Constants.API_URL_RECORD_USER_CLICK_STREAM);

/**
 * Set value of query field.
 * @param {?string} query
 * @private
 */
org.jboss.search.page.SearchPage.prototype.setUserQuery_ = function(query) {
    var newValue = "";
    if (!goog.string.isEmptySafe(query)) {
        newValue = query.trim();
    }
    this.elements_.getQuery_field().value = newValue;
};

/**
 * Stop and release (dispose) all resources related to user entertainment.
 * @private
 */
org.jboss.search.page.SearchPage.prototype.disposeUserEntertainment_ = function() {
    this.userIdleDelay_.stop();
    goog.dispose(this.userIdle_);
};

/** @private */
org.jboss.search.page.SearchPage.prototype.disableSearchResults_ = function () {
    goog.dom.classes.add(this.elements_.getSearch_results_div(), org.jboss.search.Constants.DISABLED);
};

/** @private */
org.jboss.search.page.SearchPage.prototype.enableSearchResults_ = function () {
    goog.dom.classes.remove(this.elements_.getSearch_results_div(), org.jboss.search.Constants.DISABLED);
};

/**
 * @return {!Object.<(goog.events.KeyCodes|number), function(goog.events.KeyEvent, goog.async.Delay)>}
 * @private
 */
org.jboss.search.page.SearchPage.prototype.getPresetKeyHandlers_ = function() {

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeEscHandler = goog.bind(function(event, delay) {
        if (!event.repeat) {
            delay.stop();
            this.hideAndCleanSuggestionsElementAndModel_();
        }
    }, this);

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeDownHandler = goog.bind(function(event, delay) {
        event.preventDefault();
        if (this.query_suggestions_view_.isVisible()) {
            this.query_suggestions_view_.selectNext();
        }
    }, this);

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeUpHandler = goog.bind(function(event, delay) {
        event.preventDefault();
        if (this.query_suggestions_view_.isVisible()) {
            this.query_suggestions_view_.selectPrevious();
        }
    }, this);

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeRightHandler = function(event, delay) {
        // will do something later...
    };

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeTabHandler = goog.bind(function(event, delay) {
        delay.stop();
        this.hideAndCleanSuggestionsElementAndModel_();
    }, this);

    /**
     * @param {goog.events.KeyEvent} event
     * @param {goog.async.Delay} delay
     */
    var keyCodeEnterHandler = goog.bind(function(event, delay) {
        var selectedIndex = this.query_suggestions_view_.getSelectedIndex();
        this.hideAndCleanSuggestionsElementAndModel_();
        event.preventDefault();
        delay.stop();
        if (selectedIndex < 0) {
            // user hit enter and no suggestions are displayed (yet) use content of query field
            var query = this.elements_.getQuery_field().value;
            this.dispatchEvent(new org.jboss.search.page.event.QuerySubmitted(query));
        } else if (selectedIndex == 0) {
            // suggestions are displayed, user selected the first one (use what is in query field)
            var query = this.elements_.getQuery_field().value;
            this.dispatchEvent(new org.jboss.search.page.event.QuerySubmitted(query));
        } else if (selectedIndex > 0) {
            // user selected from suggestions, use what is in model
            // TODO get query_string from model at the selectedIndex position
            this.dispatchEvent(new org.jboss.search.page.event.QuerySubmitted("option was selected by keys (index: "+selectedIndex+")"));
        }
    }, this);

    // prepare keyHandlers for the main search field
    var keyHandlers = {};

    keyHandlers[goog.events.KeyCodes.ESC] = keyCodeEscHandler;
    keyHandlers[goog.events.KeyCodes.UP] = keyCodeUpHandler;
    keyHandlers[goog.events.KeyCodes.DOWN] = keyCodeDownHandler;
    keyHandlers[goog.events.KeyCodes.RIGHT] = keyCodeRightHandler;
    keyHandlers[goog.events.KeyCodes.ENTER] = keyCodeEnterHandler;

    // TAB key does not seem to yield true in @see {goog.events.KeyCodes.isTextModifyingKeyEvent}
    // thus we have to handle it
    keyHandlers[goog.events.KeyCodes.TAB] = keyCodeTabHandler;

    return keyHandlers;
};

/**
 * Hide and clean suggestions element and empty the suggestions model.
 * @private
 */
org.jboss.search.page.SearchPage.prototype.hideAndCleanSuggestionsElementAndModel_ = function() {

    this.xhrManager_.abort(org.jboss.search.Constants.SEARCH_SUGGESTIONS_REQUEST_ID, true);
    // abort with 'true' does not fire any event, thus we have to fire our own event
    this.dispatchEvent(org.jboss.search.suggestions.event.EventType.SEARCH_FINISH);

    this.query_suggestions_view_.hide();
    this.query_suggestions_model = {};
};

/**
 * TODO
 * @param {!Object} model
 * @return {!Object}
 * @private
 */
org.jboss.search.page.SearchPage.prototype.parseQuerySuggestionsModel_ = function(model) {
    return model;
};

/**
 * @return {boolean}
 * @private
 */
org.jboss.search.page.SearchPage.prototype.isDateFilterExpanded_ = function () {
    return !goog.dom.classes.has(this.elements_.getDate_filter_body_div(), org.jboss.search.Constants.HIDDEN);
};

/**
 * @return {boolean}
 * @private
 */
org.jboss.search.page.SearchPage.prototype.isProjectFilterExpanded_ = function () {
    return !goog.dom.classes.has(this.elements_.getProject_filter_body_div(), org.jboss.search.Constants.HIDDEN);
};

/**
 * @return {boolean}
 * @private
 */
org.jboss.search.page.SearchPage.prototype.isAuthorFilterExpanded_ = function () {
    return !goog.dom.classes.has(this.elements_.getAuthor_filter_body_div(), org.jboss.search.Constants.HIDDEN);
};

/** @private */
org.jboss.search.page.SearchPage.prototype.expandDateFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getDateFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.expandFilter()
    }
};

/** @private */
org.jboss.search.page.SearchPage.prototype.expandAuthorFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getAuthorFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.expandFilter()
    }
};

/** @private */
org.jboss.search.page.SearchPage.prototype.expandProjectFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getProjectFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.expandFilter()
    }
};

/** @private */
org.jboss.search.page.SearchPage.prototype.collapseDateFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getDateFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.collapseFilter()
    }
};

/** @private */
org.jboss.search.page.SearchPage.prototype.collapseProjectFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getProjectFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.collapseFilter()
    }
};

/** @private */
org.jboss.search.page.SearchPage.prototype.collapseAuthorFilter_ = function () {
    var filter = org.jboss.search.LookUp.getInstance().getAuthorFilter();
    if (goog.isDefAndNotNull(filter)) {
        filter.collapseFilter()
    }
};