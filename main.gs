// Create a Google Apps Script that detects when I create a calendar event, then use the pushbullet API to send them a text reminder
	
  // Declare variables
  const guestEmail = 'Enter email address that will be checked. If it's detected in the list of attendees, it will trigger the PushBullet API';  
	const phoneNumber = 'The number we will text';
	const pushbulletAccessToken = 'The PushBullet access token';
  const deviceID = 'The ID of your phone as detected by PushBullet';


/**
 * This function is triggered when a new event is created on the calendar.
 * It checks if the specified guest is attending the event and sends a text via Pushbullet if so.
 *
 * @param {object} event The Google Calendar event object.
 */

function onEventCreated(event) {

	// Check if the event has the specified guest
	const guests = event.attendees;
	const isGuestPresent = guests.some(guest => guest.email === guestEmail);
	if (isGuestPresent) {
		sendPushbulletNotification(pushbulletAccessToken, phoneNumber, event.summary, formatDate(event.start.dateTime), formatDate(event.end.dateTime), event.htmlLink);
	}
}

/**
 * Sends a Pushbullet notification to the specified phone number with details about a calendar event.
 *
 * @param {string} token The Pushbullet access token.
 * @param {string} phoneNumber The phone number to send the notification to.
 * @param {string} eventTitle The title of the event.
 * @param {string} startTime The formatted start time of the event.
 * @param {string} endTime The formatted end time of the event.
 * @param {string} link The link to the event on Google Calendar.
 */

function sendPushbulletNotification(token, phoneNumber, eventTitle, startTime, endTime, link) {
	const url = 'https://api.pushbullet.com/v2/texts';
	const payload = {
    data: {
      target_device_iden: deviceID,
      addresses: [phoneNumber],
      message: "Shared from Ryan's calendar: " + eventTitle + " from " + startTime + " to " + endTime + ". " + link,
      status: 'queued'
    }
	};
	const options = {
		method: 'post',
		contentType: 'application/json',
		headers: {
			'Access-Token': token
      // 'Content-Type': 'application/json'
		},
		payload: JSON.stringify(payload)
	};

	var response = UrlFetchApp.fetch(url, options);
  console.log(JSON.parse(response));
  try {
    var response = UrlFetchApp.fetch(url, options);
    const responseJSON = JSON.parse(response.getContentText());
    console.log(responseJSON);
  } catch (error) {
    console.error("Error sending Pushbullet notification:", error);
  }
}

/**
 * This function is used for testing purposes.
 * It sends a Pushbullet notification with a predefined message.
 */

function test(){
  sendPushbulletNotification(pushbulletAccessToken, '111-222-3456', 'Testing', '9am', '10am')
}

/**
 * React on Google Calendar change with Apps Script and EventUpdated trigger
 * https://medium.com/@stephane.giron/react-on-google-calendar-change-with-apps-script-and-eventupdated-trigger-2d092547ab17
 */

function init() {
  var syncToken ;
  var nextPageToken ;
  var now = new Date();
  do{
    var page = Calendar.Events.list('primary', {
      timeMin: now.toISOString(),
      pageToken:nextPageToken}) ;

    if(page.items && page.items.length > 0){
      syncToken= page.nextSyncToken;
    }
    nextPageToken = page.nextPageToken;
    console.log('Tour 1')
  }while(nextPageToken)
  
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

function calendarSync(e){
  var syncToken = PropertiesService.getUserProperties().getProperty('SYNC_TOKEN')
  var page = Calendar.Events.list('primary', {syncToken:syncToken}) ;
  if(page.items && page.items.length > 0){
    for(var i = 0; i< page.items.length ; i++){
      var item = page.items[i]
      console.log(JSON.stringify(item))
      // Do what you want
      // console.log(JSON.stringify(e));
      onEventCreated(item);
    }
    syncToken= page.nextSyncToken;
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
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'MM-dd-yyyy H:mm:ss');
}
