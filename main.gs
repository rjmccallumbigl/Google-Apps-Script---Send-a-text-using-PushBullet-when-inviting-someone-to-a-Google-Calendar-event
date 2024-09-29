/**
 * Create a Google Apps Script that detects when I create a calendar event, then use the PushBullet API to send a text reminder.
 *
 */

// Declare variables
const GUESTEMAIL = 'Enter email address that will be checked. If it's detected in the list of attendees, it will trigger the PushBullet API';  
const PHONENUMBER = 'The number we will text';
const PUSHBULLETACCESSTOKEN = 'The PushBullet access token';
const DEVICEID = 'The ID of your phone as detected by PushBullet';

/**
 * This function is triggered when a new event is created on the calendar.
 * It checks if the specified guest is attending the event and sends a text via Pushbullet if so.
 *
 * @param {object} event The Google Calendar event object.
 */

function onEventCreated(event) {

  // Check if the event has the specified guest
  // console.log("Calendar API: " + JSON.stringify(Calendar.Events.get(Calendar.CalendarList.get("primary").id, event.id)));
  // console.log("event: " + JSON.stringify(event));
  if (event.status != 'cancelled') {
    const guests = event.attendees;
    // console.log("guests: " + guests);
    // const isGuestPresent = guests.some(function (guest) {
    //   return guest.email == GUESTEMAIL
    // });
    // console.log("isGuestPresent: " + isGuestPresent);
    if (isGuestPresent(guests)) {
      sendPushbulletNotification(PUSHBULLETACCESSTOKEN, PHONENUMBER, "Shared from Ryan's calendar: ", event.summary, formatDate(event.start.dateTime), formatDate(event.end.dateTime), event.htmlLink);
    }
  }
}

/**
 * Sends a Pushbullet notification to the specified phone number with details about a calendar event.
 *
 * @param {string} token The Pushbullet access token.
 * @param {string} phone The phone number to send the notification to.
 * @param {string} textMessage The text message we are starting our message with.
 * @param {string} eventTitle The title of the event.
 * @param {string} startTime The formatted start time of the event.
 * @param {string} endTime The formatted end time of the event.
 * @param {string} link The link to the event on Google Calendar.
 */

function sendPushbulletNotification(token, phone, textMessage, eventTitle, startTime, endTime, link) {
  const url = 'https://api.pushbullet.com/v2/texts';
  const payload = {
    data: {
      target_device_iden: DEVICEID,
      addresses: [phone],
      message: textMessage + eventTitle + " from " + startTime + " to " + endTime + ". " + link,
      status: 'queued'
    }
  };
  const stringifiedPayload = JSON.stringify(payload);
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Access-Token': token
      // 'Content-Type': 'application/json'
    },
    payload: stringifiedPayload
  };
  // console.info("stringifiedPayload: " + stringifiedPayload);
  try {
    var response = UrlFetchApp.fetch(url, options);
    // const responseJSON = JSON.parse(response.getContentText());
    console.info("responseJSON: " + response.getContentText());
    const responseCode = response.getResponseCode();
    if (responseCode < 400) {
      console.log("Successful: " + responseCode);
    } else {
      console.error("Not successful: " + responseCode);
    }
  } catch (error) {
    console.error("Error sending Pushbullet notification:", error);
  }
}

/**
 * This function is used for testing purposes. It sends a Pushbullet notification with a predefined message.
 */

function test() {
  // console.log("CalendarList: " + Calendar.CalendarList.list());
  // console.log(Calendar.CalendarList.get("primary").id);

  // console.log("Calendar API: " + JSON.stringify(Calendar.Events.get(event.id)));

  // console.log("Calendar API: " + JSON.stringify(Calendar.Events.get(Calendar.CalendarList.get("primary").id, event.id)));
  // Calendar.Events.remove("dragonduder@gmail.com", '203vnjfu88avldnj8il8tn5u0i');

  // sendPushbulletNotification(PUSHBULLETACCESSTOKEN, PHONENUMBER, 'Testing', '9am', '10am', 'Sorry please ignore.')
}

/**
 * React on Google Calendar change with Apps Script and EventUpdated trigger
 * https://medium.com/@stephane.giron/react-on-google-calendar-change-with-apps-script-and-eventupdated-trigger-2d092547ab17
 */

function init() {
  var syncToken;
  var nextPageToken;
  var now = new Date();
  do {
    var page = Calendar.Events.list('primary', {
      timeMin: now.toISOString(),
      pageToken: nextPageToken
    });

    if (page.items && page.items.length > 0) {
      syncToken = page.nextSyncToken;
    }
    nextPageToken = page.nextPageToken;
    console.log('Tour 1')
  } while (nextPageToken)

  PropertiesService.getUserProperties().setProperty('SYNC_TOKEN', syncToken)

  ScriptApp.newTrigger('calendarSync')
    .forUserCalendar(Session.getEffectiveUser().getEmail())
    .onEventUpdated()
    .create()
}

/**
 * This function is triggered whenever a calendar event is updated.
 * It retrieves a list of updated events using the latest sync token and processes them.
 *
 * @param {object} e The event object containing information about the trigger.
 */

function calendarSync(e) {
  var syncToken = PropertiesService.getUserProperties().getProperty('SYNC_TOKEN')
  var page = Calendar.Events.list('primary', { syncToken: syncToken });
  if (page.items && page.items.length > 0) {
    for (var i = 0; i < page.items.length; i++) {
      var item = page.items[i]
      // console.info("item: " + JSON.stringify(item))
      // Do what you want
      onEventCreated(item);
    }
    syncToken = page.nextSyncToken;
  }
  PropertiesService.getUserProperties().setProperty('SYNC_TOKEN', syncToken)
}

/**
 * Formats a date object into a human-readable string.
 *
 * @param {string|Date} date The date to format, either as a string or a Date object.
 * @returns {string} The formatted date string.
 */

function formatDate(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'MM-dd-yyyy H:mm');
}

/**
 * This function checks calendar events every 4 hours and sends reminders if applicable.
 */
function checkEventsForReminder() {
  const now = new Date();
  const currentHour = now.getHours();

  // Check if current time is between 6pm and 12am EST
  if (currentHour >= 18 && currentHour <= 23) {
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set time to midnight
    const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
    const overmorrow = (new Date(MILLIS_PER_DAY + tomorrow.getTime()));

    // Search events occurring tomorrow
    const calendar = Calendar.CalendarList.get("primary");
    const events = Calendar.Events.list(calendar.id, {q: GUESTEMAIL, timeMin: tomorrow.toISOString(), timeMax: overmorrow.toISOString()});
    
    // See if our guest is mentioned
    for (const event of events.items) {
      const attendees = event.attendees;
      // const isGuestPresent = isGuestPresent(attendees);
      
      if (isGuestPresent(attendees)) {
        sendPushbulletNotification(PUSHBULLETACCESSTOKEN, PHONENUMBER, "Reminder - occurring tomorrow: ", event.summary, formatDate(event.start.dateTime), formatDate(event.end.dateTime), event.htmlLink);        
      }
    }
  }
}

/**
 * Check if the email address is listed as an attendee.
 *
 * @param {array} guests The list of guests invited to attend the Google Calendar event.
 * @returns {boolean} Confirmation if our special guest is on the attendee list.
 */
function isGuestPresent(guests){
  return guests.some(function (guest) {
      return guest.email == GUESTEMAIL
    });
}
