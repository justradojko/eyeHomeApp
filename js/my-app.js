// 6   - Remote controller
// 12  - Temperature
// 256 - ON/OFF Light
// 257 - Dimmer Light
// 259 - Switch
// 513 - Aux


// Initialize your app. It can have more parameters in order to customize the app
var myApp = new Framework7({
    swipeBackPage : 'true',
    swipePanelOnlyClose: 'true',
    tapHold: 'true',
});



// Export selectors engine
var $$ = Dom7;

var lastClickedDevice;
var deviceListDb;
var checkForUpdatesTimerID = 999;

// Add view
var mainView = myApp.addView('.view-main', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});


//GRAB ALL DATA FROM SERVER IF MAIN SCREEN IS EMPTY, IF NOT, GRAP JUST UPDATE
function grabAllDataOrUpdateFromServer(){
    if ( $$(".device-container").length == 0) {
        //MAIN SCREEN IS EMPTY
        console.log('App is starting for the first time (lastUpdate attr. is null)');
        grabAllDeviceDataFromServer();        
    } else {
        //MAIN SCREEN IS NOT EMPTY
        console.log('User have logged in in the past');
        createMainScreen();

        grabDeviceDataUpdatedFromLastUpdate();
    }
}




//CODE THAT IS EXECUTED WHEN INDEX PAGE IS INITIALIZED
function initHomePage() {        
    console.log('initHomePage function is executed');
    
    //MANULLY CLOSE SPLASH SCREEN
//    navigator.splashscreen.hide();
    
    if ( localStorage.getItem("systemID") == null){
        //USER IS OPENING APP FOR THE FIRST TIME AND IS NOT LOGGED IN        
        console.log('USER IS OPENING APP FOR THE FIRST TIME AND IS NOT LOGGED IN        ');
        
        //CREATING LOCAL DATABASE
        deviceListDb = window.openDatabase('deviceList','1.0','deviceListDB', 500000);
        deviceListDb.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS deviceList');
            tx.executeSql('CREATE TABLE IF NOT EXISTS deviceList(nwkAddr int,endPoint int, deviceID int, lastValue int, customMaxValue int, userTag varchar(20), room varchar(20), favourites int, icon varchar(20), pushedToUI boolean)');
        }, function(err){
            console.log('Error: ' + err.code);
        }, function(){
            console.log('DeviceList database is created');
        });  
        
        mainView.router.load({url: 'login.html'});
    } else {
        //USER IS LOGGED IN AND HAS OPENED APP PREVIOUSLY
        console.log('USER IS LOGGED IN');
        
        //OPENING LOCAL DATABASE
        deviceListDb = window.openDatabase('deviceList','','deviceListDB', 500000);
        
        //ASSUMING THAT USER IS LOGGED IN
        $$('#place-title').html(localStorage.user + '\'s place');

        if ( $$(".device-container").length == 0) {
            console.log('MAIN SCREEN IS EMPTY. LOADING ALL DATA FROM SERVER');
            //LOAD ALL DEVICE DATA, BINDINGS AND SCHEDULINGS
            sidePanelSyncFunction();
        } else {
            console.log('MAIN SCREEN IS NOT EMPTY. LOADING JUST UPDATE FROM SERVER');
            grabDeviceDataUpdatedFromLastUpdate();
        }
//        navigator.splashscreen.hide();
    }
//    navigator.splashscreen.hide();
    
    //BINDINGS FOR LINKS ON THE SIDE PANEL
    
    $$('#side-panel-bindings').off('click', sidePanelBindingsFunction).on('click', sidePanelBindingsFunction);

    $$('#side-panel-add-new-device').off('click', sidePanelAddNewDeviceFunction).on('click', sidePanelAddNewDeviceFunction); 

    $$('#side-panel-sync').off('click', sidePanelSyncFunction).on('click', sidePanelSyncFunction);    

    $$('#side-panel-logout').off('click', sidePanelLogutFunction).on('click', sidePanelLogutFunction);
    
    $$('#side-panel-help').off('click', sidePanelLogutFunction).on('click', sidePanelLHelpFunction);
    
    
}

//if ( localStorage.getItem("systemID") != null){ //MAYBE THIS NEEDS TO BE REMOVED
//    console.log('initHome from outside');
//    initHomePage();
//}

initHomePage();


myApp.onPageInit('main', function () {
    console.log('MAIN PAGE: INITIALIZING');
    initHomePage();
});


//DEFINE FUNCTION THAT NEEDS TO BE EXECUTED WHEN PAGE IS SHOWN TO USER
// NOTE: THIS IS DUE TO NOT CALLING PAGEINIT FUNCTION EVERY TIME
$$(document).on('pageBeforeAnimation', function(e){
    var timerID = 999;
    if (e.detail.page.name == "device-details"){
        if ( localStorage.getItem("systemID") != null){
            console.log('DEVICE-DETAILS PAGE: PAGE-BEFORE-ANIMATION');                   
            // ON SLIDER CHANGE, TURN TIMER FOR 1S AND THEN SEND UPDATE TO SERVER
            $$('#dimming-slider').change(function() {    
                changeNeedsToBeSent = true;
//                console.log('Slider is moved');

                if (timerID != 999){
                    clearTimeout(timerID);
                }      

                timerID = setTimeout(function(){
//                    console.log('Sending ' + $$('#dimming-slider').val() + ' to server. Nwk Address: ' + e.detail.page.query.endpoint);
                    changeNeedsToBeSent = false;
                    sendNewDimmingValueToServer(e.detail.page.query.nwkaddress, e.detail.page.query.endpoint, $$('#dimming-slider').val());          

                }, 1000);
            });            
            
            printSchedulingToDeviceDetailsPage();
        }
    }
    
    if (e.detail.page.name == "main"){     
        if ( localStorage.getItem("systemID") != null){
            console.log('MAIN PAGE: PAGE-BEFORE-ANIMATION'); 
            console.log('pageBeforeAnimation from main page');
            grabAllDataOrUpdateFromServer();
        }
    } 
    
    if (e.detail.page.name == "device-description"){ 
        clearInterval(checkForUpdatesTimerID);        
    }  
    
    if (e.detail.page.name == "login"){
        clearInterval(checkForUpdatesTimerID);
    }
    
    if (e.detail.page.name == "add-new-device"){
        clearInterval(checkForUpdatesTimerID);
    }
    
    if (e.detail.page.name == "bindings"){
       
    }    
    
    if (e.detail.page.fromPage.url == "login.html"){ 
        console.log('LOGIN PAGE: PAGE-BEFORE-ANIMATION'); 
        initHomePage();
    };
    
    
});




//CODE THAT IS EXECUTED WHEN DEVICE_DETAILS PAGE IS LOADED
myApp.onPageInit('device-details', function(page){
    console.log('DEVICE DETAILS PAGE: ON PAGE INIT');
    
    clearInterval(checkForUpdatesTimerID);    
    
    //SETTING UP ALREADY DEFINED PARAMETERS
    $$('#dimming-value-text').html(page.query.customMaxValue + " %");
    $$('#dimming-slider').val( page.query.customMaxValue );
    
    
    // SHOW ONLY APPROPRIATE FIELDS ACCORDING TO DEVICE ID OF PRESSED DEVICE
    switch ( page.query.deviceid ) {
        case '12':
            console.log('Success');
            $$('#device-description-container').show();
            break;
        case '256':
            $$('#device-description-container, #scheduling-container').show();            
            break;
        case '257':
            $$('#device-description-container, #dimmer-container, #scheduling-container').show();
            break;            
        case '513':
            $$('#device-description-container, #scheduling-container').show();
            break;
        default:
            alert('Device ID is not supported!');
            $$('#device-description-container, #dimmer-container, #scheduling-container').hide();
    }
        
    var timerID;
    var changeNeedsToBeSent = false;
    
    // CHANGE VALUE TEXT ON SLIDER MOVE
    $$('#dimming-slider').on("input", function() {
        $$('#dimming-value-text').html( $$('#dimming-slider').val() + '%');
    });

    //HANDLING EXISTING SCHEDULING LIST
    $$('#existing-schedulings ul li').remove();        
    printSchedulingToDeviceDetailsPage();
    

    
    //GRAB DEVICE NAME, DEVICE ROOM AND FAVOURITES FROM LOCAL DATABASE
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT userTag, room, favourites FROM deviceList WHERE nwkAddr= ? AND endPoint = ?',[page.query.nwkaddress, page.query.endpoint], function(tx, result){
            console.log('Successfully fetched changes from local SQL database');
            lastClickedDevice.deviceName = result.rows.item(0).userTag;
            lastClickedDevice.deviceRoom = result.rows.item(0).room;
            lastClickedDevice.favourites = result.rows.item(0).favourites;

            console.log(lastClickedDevice.deviceName + "," + lastClickedDevice.deviceRoom + "," + lastClickedDevice.favourites);            
        }, function(err){
            console.log('There was a problem fetching data from local SQL database' + err.code);
        }, function(){                             

        });
    });        
        
    //ACTION ON SAVE BUTTON CLICK
    $$('.save-button').on('click', function(){
        
        // UPDATE NEW CUSTOM MAX VALUE TO LOCAL DATABASE
        deviceListDb.transaction(function(tx) {
            tx.executeSql("UPDATE deviceList SET customMaxValue = ? WHERE nwkAddr= ? AND endPoint = ?",[$$('#dimming-slider').val(), page.query.nwkaddress, page.query.endpoint]);
        }, function (err) {
            console.log('Error updating customMaxValue in local db: ' + err.code);
        }); 
        
        //UPDATE DATA ATTRIBUTE FOR CUSTOMMAXVALUE IN DOM
        $$("[data-nwkaddress='" + lastClickedDevice.nwkaddress + "'][data-endpoint='" + lastClickedDevice.endpoint + "']").attr('data-custommaxvalue', $$('#dimming-slider').val());
        
        //Send update of customMaxValue to server
        $$.ajax({
            type: "POST",
            url: "http://188.226.226.76/API-test/public/updateDeviceDetails/" + localStorage.token + "/" + localStorage.systemID + "/" + page.query.nwkaddress + "/" + page.query.deviceid +"/" + page.query.endpoint + "/" + lastClickedDevice.deviceName + "/" + lastClickedDevice.deviceRoom + "/" + $$('#dimming-slider').val() +"/" + lastClickedDevice.favourites + "/" + page.query.icon,
            dataType: 'json',
            success: function(data){
                mainView.router.back();    
                console.log('Update for device has been sent to server');
            },
            error: function(errorText){
                alert('Update for new device failed to been sent to server');
            }
        });                              
    });
})







//CODE THAT IS EXECUTED WHEN DEVICE_DESCRIPTION PAGE IS LOADED
myApp.onPageInit('device-description', function(){
    
    $$('#device-room-input').val(lastClickedDevice.deviceRoom.replace('__',' '));
    $$('#device-name-input').val(lastClickedDevice.deviceName);
    $$('#favourites').prop('checked', lastClickedDevice.favourites);
    
    
    $$('.save-button').on('click', function(){
        newDeviceName = $$('#device-name-input').val();
        newDeviceRoom = $$('#device-room-input').val().replace(' ','__');
        
//        console.log(newDeviceName + ", " + $('#device-room').val());
        var favourites = 0;
        if ($$('#favourites').is(':checked')){
            favourites = 1;
        }
//        if ($$("#checkbox-checked").css('display') == 'none'){
//            favourites = 0;
//        }
        
        if (  newDeviceRoom != '' && newDeviceName != '' ){
            lastClickedDevice.deviceName = newDeviceName;
            lastClickedDevice.deviceRoom = newDeviceRoom;
            lastClickedDevice.favourites = favourites;
            
            //Save update of customMaxValue to local database
            deviceListDb.transaction(function(tx) {
                tx.executeSql("UPDATE deviceList SET room = ?, userTag = ?, favourites = ?, pushedToUI = 0 WHERE nwkAddr= ? AND endPoint = ?",[newDeviceRoom, newDeviceName, favourites, lastClickedDevice.nwkaddress, lastClickedDevice.endpoint]);
            }, function (err) {
                console.log('Error updating customMaxValue in local db: ' + err.code);
            });        

            //Send update of customMaxValue to server
            console.log(localStorage.token + "/" + localStorage.systemID + "/" + lastClickedDevice.nwkaddress + "/" + lastClickedDevice.deviceid +"/" + lastClickedDevice.endpoint + "/" + newDeviceName + "/" + newDeviceRoom + "/" + lastClickedDevice.custommaxvalue +"/" + lastClickedDevice.favourites + "/" + lastClickedDevice.icon);
            
            $$.ajax({
                type: "POST",
                url: "http://188.226.226.76/API-test/public/updateDeviceDetails/" + localStorage.token + "/" + localStorage.systemID + "/" + lastClickedDevice.nwkaddress + "/" + lastClickedDevice.deviceid +"/" + lastClickedDevice.endpoint + "/" + newDeviceName + "/" + newDeviceRoom + "/" + lastClickedDevice.custommaxvalue +"/" + lastClickedDevice.favourites + "/" + lastClickedDevice.icon,
                dataType: 'json',
                success: function(data){
                    mainView.router.back();
                    console.log('Update for device has been sent to server');
                },
                error: function(errorText){
                    myApp.alert('Update for new device failed to been sent to server','Error');
                }
            }); 
        } else {
            myApp.alert('Fill all required inputs','Alert');
        }        
        
    });    
    
    
})








//CODE THAT IS EXECUTED WHEN SCHEDULING PAGE IS LOADED
myApp.onPageInit('scheduling', function(page){
    var editMode = 0;
    
    //CHECK IF NEW SCHEDULING NEEDS TO BE ADDED OR OLD EDITED
    // OLDSTARTINGTIME AND OLDENDINGTIME ARE NEEDED VARIABLES FOR TIME DRUM
    if (page.query.editMode == "1" ){
        editMode = 1;
        if (page.query.startingTime.length < 6){
            $$('#picker-starting-time').val(page.query.startingTime);
            oldStartingTime = [page.query.startingTime.substring(0, 2), page.query.startingTime.substring(3, 5)];
        } else {
            $$('#picker-starting-time').val('Set starting time');
            oldStartingTime = ['12', '20'];
        }
        if (page.query.endingTime.length < 6){
            $$('#picker-ending-time').val(page.query.endingTime);
            oldEndingTime = [page.query.endingTime.substring(0, 2), page.query.endingTime.substring(3, 5)];
        } else {
            $$('#picker-ending-time').val('Set ending time');
            oldEndingTime = ['12', '20'];
        }
        
        //SELECT DAYS WHEN SCHEDULE IS REPEATING
        tempDayPattern = page.query.dayPattern;
        if (tempDayPattern - 64 >= 0){
            tempDayPattern = tempDayPattern - 64;
            $$('#7').attr('checked', true);
        }
        if (tempDayPattern - 32 >= 0){
            tempDayPattern = tempDayPattern - 32;
            $$('#6').attr('checked', true);
        }
        if (tempDayPattern - 16 >= 0){
            tempDayPattern = tempDayPattern - 16;
            $$('#5').attr('checked', true);
        }
        if (tempDayPattern - 8 >= 0){
            tempDayPattern = tempDayPattern - 8;
            $$('#4').attr('checked', true);
        }
        if (tempDayPattern - 4 >= 0){
            tempDayPattern = tempDayPattern - 4;
            $$('#3').attr('checked', true);
        }
        if (tempDayPattern - 2 >= 0){
            tempDayPattern = tempDayPattern - 2;
            $$('#2').attr('checked', true);
        }                
        if (tempDayPattern - 1 >= 0){
            tempDayPattern = tempDayPattern - 1;
            $$('#1').attr('checked', true);
        }          
    } else {
        oldEndingTime = ['12', '20'];
        oldStartingTime = ['13', '20'];
    }
    console.log("Edit mode: " + editMode);
    
    //INITIALIZE DRUM TIME PICKERS
    var pickerStartingTime = myApp.picker({
        input: '#picker-starting-time',
        rotateEffect: true,
        toolbarTemplate: 
            '<div class="toolbar">' +
                '<div class="toolbar-inner">' +
                    '<div class="left">' +
                        '<a href="#" class="link toolbar-cancel-link">Cancel</a>' +
                    '</div>' +
                    '<div class="right">' +
                        '<a href="#" class="link close-picker">Done</a>' +
                    '</div>' +
                '</div>' +
            '</div>',  
        value : [oldStartingTime[0], oldStartingTime[1]],
        formatValue: function (p, values) {return values[0] + ':' + values[1];},
        cols: [
            {
                textAlign: 'left',
                values: ('01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24').split(' ')
            },
            {
                divider: true,
                content: ':'
            },
            {
                values: ('00 05 10 15 20 25 30 35 40 45 50 55 60').split(' ')
            },
        ],
        onOpen: function (picker) {
                picker.container.find('.toolbar-cancel-link').on('click', function () {      
                    $$("#picker-starting-time").val('Set starting time');
                    pickerStartingTime.close()
                });
            }        
    }); 
    var pickerEndingTime = myApp.picker({
        input: '#picker-ending-time',
        rotateEffect: true,
        toolbarTemplate: 
            '<div class="toolbar">' +
                '<div class="toolbar-inner">' +
                    '<div class="left">' +
                        '<a href="#" class="link toolbar-cancel-link">Cancel</a>' +
                    '</div>' +
                    '<div class="right">' +
                        '<a href="#" class="link close-picker">Done</a>' +
                    '</div>' +
                '</div>' +
            '</div>',  
        value : [oldEndingTime[0], oldEndingTime[1]],
        formatValue: function (p, values) {return values[0] + ':' + values[1];},
        cols: [
            {
                textAlign: 'left',
                values: ('01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24').split(' ')
            },
            {
                divider: true,
                content: ':'
            },
            {
                values: ('00 05 10 15 20 25 30 35 40 45 50 55 60').split(' ')
            },
        ],      
        onOpen: function (picker) {
                picker.container.find('.toolbar-cancel-link').on('click', function () { 
                    $$("#picker-ending-time").val('Set ending time');
                    pickerEndingTime.close()
                });
        }          
    });  
    
    $$("#picker-starting-time, #picker-ending-time").on('click', function(){
        if ($$(".accordion-item").hasClass("accordion-item-expanded")){
            myApp.accordionClose(".accordion-item");
        }
    })
    
    //CREATE SHEDULING TABLE IN LOCAL DATABASE IF DOESN'T EXISTS
    createSchedulingTable();
        
    $$('.save-button').on('click', function(){
        dayPattern = 0;
        if ($$('#1').is(':checked')){
            dayPattern = dayPattern + 1;
        }
        if ($$('#2').is(':checked')){
            dayPattern = dayPattern + 2;
        }
        if ($$('#3').is(':checked')){
            dayPattern = dayPattern + 4;
        }
        if ($$('#4').is(':checked')){
            dayPattern = dayPattern + 8;
        }
        if ($$('#5').is(':checked')){
            dayPattern = dayPattern + 16;
        }
        if ($$('#6').is(':checked')){
            dayPattern = dayPattern + 32;
        }
        if ($$('#7').is(':checked')){
            dayPattern = dayPattern + 64;
        }     
        
        if ($$('#picker-starting-time').val() == "Set starting time"){
            startingNewTime = 'null';
        } else {
            startingNewTime = $$('#picker-starting-time').val();
        }
        if ($$('#picker-ending-time').val() == "Set ending time"){
            endingNewTime = 'null';
        } else {
            endingNewTime = $$('#picker-ending-time').val();
        }        
        
        if (startingNewTime != 'null' || endingNewTime != 'null'){             
            if ( editMode != '0'){
                $$.ajax({
                    type: "POST",
                    url: "http://188.226.226.76/API-test/public/removeScheduling/" + localStorage.token + "/" + localStorage.systemID + "/" + lastClickedDevice.nwkaddress + "/" + lastClickedDevice.endpoint + "/" + page.query.startingTime + "/" + page.query.endingTime + "/",
                    dataType: 'json',
                    success: function(data){
                        console.log('Deletion of scheduling has been sent to server');
                    },
                    error: function(errorText){
                        customAlert('Deletion of scheduling failed to been sent to server');
                    }
                });                              
            }
            
            $$.ajax({
                type: "POST",
                url: "http://188.226.226.76/API-test/public/addScheduling/" + localStorage.token + "/" + localStorage.systemID + "/" + lastClickedDevice.nwkaddress + "/" + lastClickedDevice.endpoint + "/" + startingNewTime + "/" + endingNewTime + "/" + dayPattern +"/255",
                dataType: 'json',
                success: function(data){
                    console.log('Update of scheduling has been sent to server');
                },
                error: function(errorText){
                    console.log('Update of scheduling failed to been sent to server');
                }
            });   
            
            if ( editMode != '1'){
                deviceListDb.transaction( function(tx){
                    tx.executeSql("INSERT INTO scheduling(nwkAddr, endPoint, startingTime, endingTime, dayPattern, activated) VALUES (?, ?, ?, ?, ?, 1)", [lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, startingNewTime, endingNewTime, dayPattern], function(tx, results){
                        console.log('insert success');
                        mainView.router.back();
                    });
                });                                 
            } else {
                deviceListDb.transaction( function(tx){
                    tx.executeSql('UPDATE scheduling SET startingTime = ?,endingTime = ?, dayPattern = ? WHERE nwkAddr = ? AND startingTime = ? AND endingTime = ? AND endPoint = ?', [startingNewTime, endingNewTime, dayPattern, lastClickedDevice.nwkaddress, page.query.startingTime, page.query.endingTime, lastClickedDevice.endpoint ], function(){
                        console.log('update success');
                        mainView.router.back();
                    });
                });                                                 
            }         
        } else {
            alert('Please, fill starting or ending time');
        }           
    });
})







//CODE THAT IS EXECUTED WHEN SCHEDULING PAGE IS LOADED
myApp.onPageInit('add-new-device', function(){
    console.log('ADD-NEW-DEVICE PAGE: INITIALIZING');
    
    $$('#allow-adding-new-device').show(); 
    $$('.swiper-container').hide();
    
    var mySwiper;
    var timerID = 999;
    checkForNewDevices(timerID);
    
    console.log('TimerID: ' + timerID);    
    
    $$('#add-device-button-add-new-device').on('click', addNewDeviceButton);
    
    $$('#allow-adding-new-device-switch').on('change', function(){
        if ($$('#allow-adding-new-device-switch').is(':checked')){
            allowJoining();
            timerID = setInterval(function(){
                checkForNewDevices(timerID);
                console.log('JOINING ALLOWED');                
                $$('#button-add-new-device').show();
                console.log('Checking for new devices....');
            },20000);            
        } else {
            clearInterval(timerID);
            disallowJoining();
        }

    });   
})



//GLOBAL VARIABLES THAT ARE USED JUST IN BINDINGS PAGE
var bindSource = [];
var bindDest = [];
var cluster = []; 
var selectedTrigger = {nwkAddr: 0, endPoint: 0 }; 
var arrayOfSelectedTargets = [];
var selectedTarget;
var targetToBeRemoved;
var bindPresent = 0;
var bindNotPresent = 0; 

//CODE THAT IS EXECUTED WHEN SCHEDULING PAGE IS LOADED
myApp.onPageInit('bindings', function(){
    console.log('BINGIND PAGE: INITIALIZING');
    
    clearInterval(checkForUpdatesTimerID);

 
    
    
    triggerDeviceIDArray = [6, 259];
    toBeTreiggereDeviceIDArray = [257, 256, 513];
    

    //LOAD EXISTING BINDINGS FROM LOCALDATA BASE
    deviceListDb.transaction( function(tx){
        tx.executeSql('SELECT * FROM bindings WHERE 1',[], function(tx, results){
            for (i = 0; i < results.rows.length; i++){        
                bindSource[i] = {nwkAddr: results.rows.item(i).srcNwkAddr, endPoint: results.rows.item(i).srcEndPoint};

                bindDest[i] = {nwkAddr: results.rows.item(i).destNwkAddr, endPoint: results.rows.item(i).destEndPoint};                

                cluster[i] = results.rows.item(i).cluster;
            }
        });
    });  
    
    //GRAB LIST OF ALL DEVICES FROM LOCAL DATABASE
    //AND DEFINE ACTION THAT WILL BE TRIGGERED WHEN ROW IS PRESSED
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM deviceList WHERE 1',[], function(tx, result){
            console.log('Successfully fetched all data from local SQL database ('+result.rows.length+')');

                for (i = 0; i < result.rows.length; i++){
                    if ( triggerDeviceIDArray.indexOf(result.rows.item(i).deviceID) >= 0){
                        // DEVICE IS A TRIGGER 
                        if (result.rows.item(i).deviceID == '6'){ //REMOTE
                            buttonNumber = result.rows.item(i).endPoint -20 + 1;
                        }
                        if (result.rows.item(i).deviceID == '259'){ //WALL SWITCH
                            buttonNumber = result.rows.item(i).endPoint - 5 + 1;
                        }                
                        $$('#triggering-device-list').append(
                            "<li class='item-content' data-nwkaddress='" + result.rows.item(i).nwkAddr + "' data-endpoint='" + result.rows.item(i).endPoint + "'>" +
                            "    <div class='item-media'><img src='img/devices/" +result.rows.item(i).icon+"-ON.png'></img></div>" +
                            "       <div class='item-inner'>" +
                            "           <div class='item-title triggering-device-title'> " + 
                            "               <span class='first binding-device-label'> " + result.rows.item(i).userTag + "</span> " +
                            "               <span class='second binding-device-label'>Btn." + buttonNumber + "</span> " +
                            "               <span class='third binding-device-label'> " + result.rows.item(i).room.replace('__',' ') + "</span> " +
                            "           <div class='item-after'><span class='fifth'></span></div>" +
                            "           </div>" +
                            "           <div class='item-after'></div>" +
                            "       </div>" + 
                            "</li>");

                    } else if ( toBeTreiggereDeviceIDArray.indexOf(result.rows.item(i).deviceID) >= 0){
                        // DEVICE IS TRIGGERED
                        $$('#targeted-device-list').append(
                            "<li class='item-content' data-nwkaddress='" + result.rows.item(i).nwkAddr + "' data-endpoint='" + result.rows.item(i).endPoint + "'>" +
                            "    <div class='item-media'><img src='img/devices/" +result.rows.item(i).icon+"-ON.png'></img></div>" +
                            "       <div class='item-inner'>" +
                            "           <div class='item-title targeted-device-title'> " + 
                            "               <span class='fourth binding-device-label'> " + result.rows.item(i).userTag + "</span> " +
                            "               <span class='fourth binding-device-label'> " + result.rows.item(i).room.replace('__',' ') + "</span> " +
                            "           </div>" +
                            "           <div class='item-after'><span class='fifth'></span></div>" +
                            "           <div class='item-after'></div>" +
                            "       </div>" + 
                            "</li>");
                        
                    }
                }

                bindActionsToTableRows();
            
        }, function(err){
            console.log('There was a problem fetching data from local SQL database' + err.code);
        }, function(){
            console.log('Filling binding tables is finished');           
        });
    });  
    
    
    $$('#save-button-bindings').on('click', function(){      //bind/Unbind button
        bind = 5;  //some defualt value
        if ( $$('#save-button-bindings').text() == 'Bind' ){
            bind = 255;
        } else if ( $$('#save-button-bindings').text() == 'Unbind' ){
            bind = 0;
        }
        
        if (bind != '5'){
            for (i = 0; i < arrayOfSelectedTargets.length; i++){
                console.log('sendingBindToServer');
                sendBindingToServer(selectedTrigger, {nwkAddr: arrayOfSelectedTargets[i].nwkAddr, endPoint: arrayOfSelectedTargets[i].endPoint}, '6', bind);   
                if (bind == 255){ //add new binding
                    console.log('Adding bind to local database');
                    addBindingToLocalDB(selectedTrigger, {nwkAddr: arrayOfSelectedTargets[i].nwkAddr, endPoint: arrayOfSelectedTargets[i].endPoint}, '6');
                } else { //remove binding
                    console.log('Remove bind from local database');
                    removeBindingToLocalDB(selectedTrigger, {nwkAddr: arrayOfSelectedTargets[i].nwkAddr, endPoint: arrayOfSelectedTargets[i].endPoint}, '6');
                }
            }
        }
    });    
    
    
    
    
})







//CODE THAT IS EXECUTED WHEN SCHEDULING PAGE IS LOADED
myApp.onPageInit('login-screen', function(){
    console.log('LOGIN PAGE: INITIALIZING');
    
//    console.log('LOGIN PAGE: CLEARING LOCALSTORAGE');
//    localStorage.clear();
    
    $$('#sign-in').on('click', function(){
        console.log('Signining in');
        var username = $$('input[name="username"]').val();
        var password = $$('input[name="password"]').val();
        
        $$.ajax({
            type: "GET",
            url: "http://188.226.226.76/API-test/public/login/" + username + "/" + password,

            dataType: 'json',
            success: function(data){
                localStorage.token = data.data.token; 
                localStorage.user = data.data.username;
                localStorage.systemID = data.data.systemID;
                localStorage.lastDeviceListUpdate = 'null';
                
//                mainView.router.back();
                mainView.router.load({url: 'index.html'});
            },
            error: function(errorText){
                alert("Login failed");
                $$('#login-button').html("Login");
            }
        });
    });
    
    $$('#register-button').click(function(){
        if ($$('#register-name').val() != "") {
            if ($$('#register-email').val() != "") {
                if ($$('#register-password').val() != "") {

                    $$.ajax({
                        type: "POST",
                        url: "http://188.226.226.76/API-test/public/registerUser/" + $$("#register-name").val() + "/" + $$("#register-email").val() + "/" + $$("#register-password").val(),

                        dataType: 'json',
                        success: function(data){
//                            $$('#register-button').html("Success!");
                            localStorage.token = data.data.token; 
                            localStorage.user = data.data.username;
    //                        window.location.href = "index.html";
                        },
                        error: function(errorText){
                            alert("Register failed");
                            $$('#register-button').html("Register");
                        }
                    });
                } else {
                    alert("Password field is empty");          
                }
            } else {
                alert("Eamil field is empty");      
            }
        } else {
            alert("Name field is empty");
        }
    });    
    
    
    $$('.swap-register-login-button').on('click', function(){
        $$('#register-login-label').attr('disabled', true);
        if ($$('#login-container').offset().left > -10){ 
//            $$('#login-container').animate({ left: '-150%' }, 500 );
            $$('#login-container').transform('translateX(-110vw)');
            $$('#login-container').transition(300);

            $$('#register-container').transform('translateX(-110vw)');
            $$('#register-container').transition(300);
            
//            $$('#register-fields-container').animate({ left: '10px' }, 500 ).delay(500);
            
            $$('#register-login-label span').text('LOGIN');        
        } else {
            $$('#login-container').transform('translateX(0)');
            $$('#login-container').transition(300);

            $$('#register-container').transform('translateX(110vw)');
            $$('#register-container').transition(300);
            $$('#register-login-label span').text('REGISTER');        
        }
//        setTimeout(function(){
//            $$('#register-login-label').attr('disabled', false);
//        }, 1000);
    });    
});





































// Generate dynamic page
var dynamicPageIndex = 0;
function createContentPage() {
	mainView.router.loadContent(
        '<!-- Top Navbar-->' +
        '<div class="navbar">' +
        '  <div class="navbar-inner">' +
        '    <div class="left"><a href="#" class="back link"><i class="icon icon-back"></i><span>Back</span></a></div>' +
        '    <div class="center sliding">Dynamic Page ' + (++dynamicPageIndex) + '</div>' +
        '  </div>' +
        '</div>' +
        '<div class="pages">' +
        '  <!-- Page, data-page contains page name-->' +
        '  <div data-page="dynamic-pages" class="page">' +
        '    <!-- Scrollable page content-->' +
        '    <div class="page-content">' +
        '      <div class="content-block">' +
        '        <div class="content-block-inner">' +
        '          <p>Here is a dynamic page created on ' + new Date() + ' !</p>' +
        '          <p>Go <a href="#" class="back">back</a> or go to <a href="services.html">Services</a>.</p>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    );
	return;
}