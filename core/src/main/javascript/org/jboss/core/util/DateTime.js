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
 * @fileoverview Utility to round DateTime up to days.
 * @author Lukas Vlcek (lvlcek@redhat.com)
 */

goog.provide('org.jboss.core.util.dateTime');

goog.require('org.jboss.core.service.Locator');
goog.require('goog.string');
goog.require('goog.date.DateTime');
goog.require('goog.i18n.DateTimeFormat');

/**
 * Floor given instance of DateTime down to days.  This means it drops everything below the days.
 * It does not change input instance but returns a new instance of DateTime.
 *
 * @param {goog.date.DateTime} dateTime
 * @return {!goog.date.DateTime}
 */
org.jboss.core.util.dateTime.floorToDays = function(dateTime) {
	var dt = dateTime.clone();
	dt.setHours(0);
	dt.setMinutes(0);
	dt.setSeconds(0);
	dt.setMilliseconds(0);
	return dt;
};

/**
 * Format given DateTime using the formatter.
 *
 * @param {goog.date.DateTime} dateTime
 * @param {goog.i18n.DateTimeFormat} formatter
 * @return {string}
 */
org.jboss.core.util.dateTime.format = function(dateTime, formatter) {
	return formatter.format(dateTime);
};

/**
 * Format given DateTime using predefined short date format.
 *
 * @param dateTime
 * @return {string}
 */
org.jboss.core.util.dateTime.formatShortDate = function(dateTime) {
	return org.jboss.core.util.dateTime.format(dateTime,
		org.jboss.core.service.Locator.getInstance().getLookup().getShortDateFormatter()
	);
};

/**
 * Format given DateTime using predefined medium date format.
 * Note that the {@link goog.i18n.DateTimeFormat} produces AM/PM markers (uppercased). We convert it to lowercase manually.
 * Just out of curiosity, there is a method {@link goog.date.DateTime#toUsTimeString(false, true, true)}
 * which produces lowercased pm/am.
 *
 * @param dateTime
 * @return {string}
 */
org.jboss.core.util.dateTime.formatMediumDate = function(dateTime) {
	var str = org.jboss.core.util.dateTime.format(dateTime,
		org.jboss.core.service.Locator.getInstance().getLookup().getMediumDateFormatter()
	);
	return str.replace(/PM$/, "pm").replace(/AM$/, "am");
};