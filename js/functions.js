// ******************FUNCTION FOR LOADING THE DATA FROM SERVER AND UPDATING THE MAIN SCREEN *************************************


function dropTableInLocalDatabase(table){
    var query = "DELETE FROM " + table + " WHERE 1";
    deviceListDb.transaction(function(tx) {
        tx.executeSql(query);
    }, function(){
        console.log("Error clearing " + table + " table in local db");        
    },function () {
        console.log("Local " +  table + " table is cleared");
    });     
}

//  - GRAB ALL DEVICE DATA FROM LOCAL DATABASE
//  - CREATE MAIN SCREEN
function createMainScreen(){
    //CLEAR MAIN SCREEN
    $$('[data-page="main"] .content-block-inner .room-section').remove();
    $$('#main-screen-preloader').hide();
    
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM deviceList WHERE deviceID = 257 OR deviceID = 12 OR deviceID=256 OR deviceID=513 OR deviceID=512',[], function(tx, result){
            console.log('Creating UI on the main screen with data from local database');

            for (var i = 0; i < result.rows.length; i++){
                createDeviceInRoomSection(result.rows.item(i));
            }            
        }, function(err){
            console.log('Error in SQL quert' + err.code);
        }, function(){
            console.log('Main screen is created');
            bindClickActionToIconsOnTheMainScreen();
            bindTapholdActionToIconsOnTheMainScreen();
            tx.executeSql('UPDATE deviceList SET pushedToUI = 1 WHERE pushedToUI = 0');
        });
    }); 
    $$('.scroller').css('height', ($$('.content-block-inner').height() + 200) + "px");
}

//  - GRAB DATA FROM LOCAL DATABASE THAT ARE NOT UPDATED TO MAIN SCREEN
//  - UPDATE MAIN SCREEN
//  - UPDATE LOCAL DATABASE (PUSHEDTOUI COLUMN)
function updateMainScreen(){
    $$('#main-screen-preloader').hide();
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM deviceList WHERE pushedToUI = 0 AND (deviceID = 257 OR deviceID = 12 OR deviceID=256 OR deviceID=513 OR deviceID=512)',[], function(tx, result){
            console.log('Updating UI on the main screen with updates from server ('+result.rows.length+')...');

            for (var i = 0; i < result.rows.length; i++){
                createDeviceInRoomSection(result.rows.item(i));
            }     
            
            console.log('Main screen is updated');
            bindClickActionToIconsOnTheMainScreen();
            bindTapholdActionToIconsOnTheMainScreen();
            
            if (checkForUpdatesTimerID != 999){
                console.log('Clearing checkForUpdatesTimerID');
                clearInterval(checkForUpdatesTimerID);
                checkForUpdatesTimerID = 999;
            }
            console.log('Starting timer for periodical checking for updates on server');
            checkForUpdatesTimerID = setInterval(grabDeviceDataUpdatedFromLastUpdate, 200000); //RADOJKO
            
            updateScheduleIcons();
            
            tx.executeSql('UPDATE deviceList SET pushedToUI = 1 WHERE pushedToUI = 0');            
        }, function(err){
            console.log('Error in SQL quert' + err.code);
        });
    });   
}

//CREATE ROOM SECTION IF DOESN'T EXITS ON THE MAIN SCREEN
function createRoomSectionIfDontExist(room){
    if ( $$("#" + room + "-section").length == 0 ){
        if (room == 'favourites'){
            $$(".content-block-inner").prepend(
                "<div class=\"room-section\" id=\"favourites-section\">" +
                "   <hr class=\"seperation-line-room-section\">" +
                "   <div class=\"content-block-title room-section-title\">" + room.replace('__',' ') + " section</div>" +
                "   <div class=\"device-container\"></div>" +
                "</div>"
            );
        } else {
            $$(".content-block-inner").append(
                "<div class=\"room-section\" id=\"" + room +"-section\">" +
                "   <hr class=\"seperation-line-room-section\">" +
                "   <div class=\"content-block-title room-section-title\">" + room.replace('__',' ') + " section</div>" +
                "   <div class=\"device-container\"></div>" +
                "</div>"
            );
        }    
    }
}

function createDeviceInRoomSection(device){
    //CREATE NEW ROOM SECTION IF IT DOES NOT EXIST
    createRoomSectionIfDontExist(device.room);
    
    //ADD DEVICE IN APPROPRIATE ROOM SECTION IF IT DOES NOT EXISTS
    if ($$("#"+device.room+"-section [data-nwkaddress='" + device.nwkAddr + "'][data-endpoint='" + device.endPoint + "']").length == 0){
        //DEFINING IF ICON IS AN IMAGE OR FORMATED TEMPERATURE
        if (device.deviceID != "12"){ //DEVICE IS NOT TEMPERATURE
            if (device.lastValue == 0){ 
                iconLine = "    <img class='device-icon' href='#' src='img/devices/" + device.icon +"-OFF.png'>" 
            } else{ 
                iconLine = "    <img class='device-icon' href='#' src='img/devices/" + device.icon +"-ON.png'>" 
            }            
        } else { //DEVICE IS TEMPERATURE
            var tempVal = (device.lastValue/2-40).toString().split('.');
            if (tempVal[0] < 0){
                tempVal[0] = tempVal[0] + 1;
            }
            if (tempVal[1] == undefined){
                tempVal[1] = 0;
            }                                            
            iconLine = "    <div class='fake-image-for-temp-icon'><p>" + tempVal[0] + ".<span>" + tempVal[1] + "</span><span>&deg</span></p></div>"; 
        }
        
        if (device.favourites){
            //CREATE FAVOURITES SECTION IF IT DOES NOT EXIST
            createRoomSectionIfDontExist('favourites');
            
            //ADD DEVICE IN FAVOURITES SECTION IF IT DOES NOT EXISTS
            if ($$("#favourites-section [data-nwkaddress='" + device.nwkAddr + "'][data-endpoint='" + device.endPoint + "']").length == 0){
                //ADDING NEW DEVICE IN THE FAVOURITE SECTION DOM 
                $$("#favourites-section .device-container").append(
                    "<div class='device' data-nwkaddress='" + device.nwkAddr + "' data-endpoint='" + device.endPoint + "' data-deviceID='" + device.deviceID + "' data-icon='" + device.icon + "' data-custommaxvalue='" + device.customMaxValue + "' data-lastvalue='" + device.lastValue + "'>" +
                    iconLine +
                    "    <div class='scheduling-icon-container'><img class='scheduling-icon' src='img/schedule-icon.png'></div> " +
                    "    <p class='device-label'>" + device.userTag +"</p>" +
                    "</div>"
                );                
            }
        }
        
        //ADDING NEW DEVICE IN THE DOM
        $$("#" + device.room + "-section .device-container").append(
            "<div class='device' data-nwkaddress='" + device.nwkAddr + "' data-endpoint='" + device.endPoint + "' data-deviceID='" + device.deviceID + "' data-icon='" + device.icon + "' data-custommaxvalue='" + device.customMaxValue + "' data-lastvalue='" + device.lastValue + "'>" +
            "    " + iconLine +                        
            "    <div class='scheduling-icon-container'><img class='scheduling-icon' src='img/schedule-icon.png'></div> " +
            "    <p class='device-label'>" + device.userTag +"</p>" +
            "</div>"
        );
    } else{
        //IF DEVICE EXISTS, UPDATE VALUE)
        changeDeviceIconAndAttributes(device.nwkAddr, device.endPoint, device.icon, device.lastValue, 1);        
    }
}

//LOADING DEVICE STATES THAT ARE CHANGED SINCE LAST CHECK
//  - DATA IS LOADED FROM THE SERVER
//  - LOCAL DEVICELIST TABLE IS UPDATED
//  - MAIN SCREEN IS UPDATED    
function grabDeviceDataUpdatedFromLastUpdate(){        
        var p = new Date()
//        p.setHours(p.getHours()+2);
        p = p.toISOString().slice(0, 19).replace('T', '@');        
        console.log('Fetching changes from server since last update: ' + p);
        $$.ajax({
            type: "GET",
            url: "http://188.226.226.76/API-test/public/deviceListSinceTimestamp/" + localStorage.token + "/" + localStorage.systemID + "/" +localStorage.lastDeviceListUpdate,

            dataType: 'json',
            success: function(data){                
                console.log('Update from server: ');
                console.log(data);
                
                localStorage.lastDeviceListUpdate = p;
                numberOfChangedDevices = data.data.length;
                $$('$main-screen-preloader').hide();
                if (numberOfChangedDevices > 0){                    
                    console.log('Number of changed device states from server since last check: '+numberOfChangedDevices);

                    //CHECK IF THERE IS A POSSIBILITY TO LOAD DEVICE THAT IS NO IN THE LOCAL DEVICELIST TABLE
                    //update local deviceList table. If there is some new devices they will be added, if they are known, state will be just updated
                    for (var j = 0; j < numberOfChangedDevices; j++){
                        deviceListDb.transaction((function(privateJ) {
                            return function(tx){
                            //checking if device is already in the table
                            tx.executeSql('SELECT * FROM deviceList WHERE nwkAddr = ? AND endPoint = ?',[data.data[privateJ].nwkAddress, data.data[privateJ].endPoint], function(tx, results){
                                if (results.rows.length > 0){
                                    //device in the table
    //                                console.log('Device exists (' + data.data[privateJ].nwkAddress + ',' + data.data[privateJ].endPoint + ') in local db. Updating value.');
                                    tx.executeSql('UPDATE deviceList SET lastValue = ?, pushedToUI = 0 WHERE nwkAddr = ? AND endPoint = ?',[data.data[privateJ].lastValue, data.data[privateJ].nwkAddress, data.data[privateJ].endPoint])
                                } else {
                                    //new device loaded from server
                                    tx.executeSql("INSERT INTO deviceList(nwkAddr, endPoint, deviceID, lastValue, customMaxValue, userTag, room, favourites, icon, pushedToUI) VALUES (?,?,?,?,?,?,?,?,?,0)",[ data.data[privateJ].nwkAddress, data.data[privateJ].endPoint, data.data[privateJ].deviceID, data.data[privateJ].lastValue, data.data[privateJ].customMaxValue, data.data[privateJ].userTag, data.data[privateJ].room, data.data[privateJ].favourites, data.data[privateJ].icon]);
                                }
                            });
                            }
                        })(j)); 
                    }
                    updateMainScreen();
                } else {
                    $$('#main-screen-preloader').hide();                    
                    myApp.alert('There is no devices in the system','Information');
                    bindClickActionToIconsOnTheMainScreen();
                    bindTapholdActionToIconsOnTheMainScreen();
                    updateScheduleIcons();
                }
                
            },
            error: function(errorText){
                console.log("Fetching changes from server failed, try later");
                bindClickActionToIconsOnTheMainScreen();
                bindTapholdActionToIconsOnTheMainScreen();
                updateScheduleIcons();
            }    
        });       
}

//LOADING ALL DEVICE STATES FROM THE SERVER
//  - DATA IS LOADED FROM THE SERVER
//  - LOCAL DEVICELIST TABLE IS UPDATED
//  - MAIN SCREEN IS UPDATED
function grabAllDeviceDataFromServer(){
    var p = new Date()
//        p.setHours(p.getHours());
    p = p.toISOString().slice(0, 19).replace('T', '@');
    console.log('Loading all data from server');    
    
    $$.ajax({
        type: "GET",
        url: "http://188.226.226.76/API-test/public/deviceList/" + localStorage.token + "/" + localStorage.systemID,

        dataType: 'json',
        success: function(data){
//            deviceList = data;
            console.log('All device data from server:');
            console.log(data);

            localStorage.lastDeviceListUpdate = p;
            
            dropTableInLocalDatabase('deviceList');
 
            //INSERT DEVICE DATA FROM SERVER INTO LOCAL TABLE
            deviceListDb.transaction(function(tx) {
                for (var k = 0; k < data.data.length; k++){
                    tx.executeSql("INSERT INTO deviceList (nwkAddr, endPoint, deviceID, lastValue, customMaxValue, userTag, room, favourites, icon, pushedToUI) VALUES (?,?,?,?,?,?,?,?,?,0)",[ data.data[k].nwkAddress, data.data[k].endPoint, data.data[k].deviceID, data.data[k].lastValue, data.data[k].customMaxValue, data.data[k].userTag, data.data[k].room, data.data[k].favourites, data.data[k].icon]);
                }
            }, function (err) {
                console.log('Error in SQL query: ' + err.code);
            }, function(){
                console.log('All data is loaded from server');
//                console.log('Main screen is updated');
                $$('#main-screen-preloader').hide();
                updateMainScreen();
            }); 
            

        },
        error: function(errorText){
            console.log("Loading data from server failed");
        }
    });    
    
}

// ******************************************************************************************************************************





// ********************************* FUNCTIONS FOR HANDLING CHANGING OF DEVICE STATE ON CLICK ***********************************

// CHANGE DEVICE ICON AND DEVICE LAST VALUE
function changeDeviceIconAndAttributes(nwkAddr, endPoint, icon, newValue){
    //CHANGE DEVICES ICON
    if (icon != 'Temperature'){
        if (newValue == 0){
            $$("[data-nwkaddress='" + nwkAddr + "'][data-endpoint='" + endPoint + "']").children('img').attr('src','img/devices/' + icon + '-OFF.png');
        } else {
            $$("[data-nwkaddress='" + nwkAddr + "'][data-endpoint='" + endPoint + "']").children('img').attr('src','img/devices/' + icon + '-ON.png');
        }    
        //CHANGE LAST VALUE
        $$("[data-nwkaddress='" + nwkAddr + "'][data-endpoint='" + endPoint + "']").attr('data-lastvalue', newValue);
    } else {
        //IF DEVICE IS TEMPERATURE, UPDATE CURRENT VALUE
        var tempVal = (newValue/2-40).toString().split('.');
        if (tempVal[0] < 0){
            tempVal[0] = tempVal[0] + 1;
        }
        if (tempVal[1] == undefined){
            tempVal[1] = 0;
        }                                            
        iconLine = "    <div class='fake-image-for-temp-icon'><p>" + tempVal[0] + ".<span>" + tempVal[1] + "</span><span>&deg</span></p></div>"; 
        $$("[data-nwkaddress='37528'] .fake-image-for-temp-icon").html(iconLine);
    }
}

//  SENDING NEW DEVICE STATE TO SERVER
//  CALLING A FUNCTION AFTER 5S TO CHECK IF NEW STATE IS PUSHED TO THE HOME SYSTEM
function sendNewDeviceValueToServer(nwkAddr, endPoint, newValue, lastValue, icon, checkForAck, updateServerDB){    
    $$.ajax({
        type: "POST",
        url: "http://188.226.226.76/API-test/public/deviceState/" + localStorage.token + "/" + localStorage.systemID + "/" + nwkAddr + "/" + endPoint + "/" + newValue + "/" + updateServerDB,

        dataType: 'json',

        success: function(data){
            console.log('New state ' + newValue + ' is sent to server for nwkAddr: '+ nwkAddr);
            if(checkForAck){
                var intervalID = setTimeout(function () {
                    loopingFunctionForDeviceStateChangeAck(nwkAddr, endPoint, newValue, lastValue, intervalID, icon);
                }, 5000);  
            
                if (localStorage.getItem(nwkAddr + "" + endPoint, intervalID) !== null){
                    clearTimeout(localStorage.getItem(nwkAddr + "" + endPoint));
                } 
                localStorage.setItem(nwkAddr + "" + endPoint, intervalID);
            }
        },
        error: function(errorText){
            console.log("Update of new state failed to be sent to server");
        }   
    });    
}

// FUNCTION IS CALLED 5S AFTER NEW STATE OF DEVICE IS SENT TO SERVER
//  - ASK FOR A STATE OF CLICKED DEVICE
//  - CHECK IF THAT STATE IS MATCHED WITH THE ONE THAT WAS SENT TO SERVER (MEANS THAT SYSTEM HAVE CHANGED DEVICE STATE)
//  - IF THERE IS A MATCH:
//          UPDATE LOCAL DATABASE
//  - IF THERE IS NO MATCH:
//          TOGGLE DEVICES DATA ATTRIBUTES AND ICON
//          IT SHOULD PROBUBLY NEED TO SEND OLD VALUE TO SERVER AND SET ACT TO 1 !!!!!!!!!!!!!!!!!!!!
function loopingFunctionForDeviceStateChangeAck(nwkAddr, endPoint, newValue, oldValue, intervalID, icon){
    $$.ajax({
        type: "GET",
        url: "http://188.226.226.76/API-test/public/deviceState/" + localStorage.token + "/" + localStorage.systemID + "/" + nwkAddr + "/" + endPoint,

        dataType: 'json',
        success: function(data){
            returnedState = data.data.deviceState;
            if (returnedState == newValue){
                console.log('Device State is successfully updated. returnedValue is: ' + returnedState);     

                deviceListDb.transaction(function(tx) {
                    tx.executeSql('UPDATE deviceList SET lastValue = ? WHERE nwkAddr = ? AND endPoint = ?', [newValue, nwkAddr, endPoint]); 
                }, function(err){
                    console.log('Error updating localDB with changed device state: ' + err.code);
                }, function(){
                    console.log('LocalDB is updated with changed device state');
                });                    

                localStorage.removeItem(nwkAddr + "" + endPoint);

            } else {
                console.log('Mismatch between desired sensor state and state from server: ' + newValue + ":" + returnedState);
//                failedDevice = $$("ul [data-nwkaddress='" + nwkAddr + "'][data-endPoint='" + endPoint + "'] p:last-child").html();

                changeDeviceIconAndAttributes(nwkAddr, endPoint, icon, oldValue);

                //send old device value to the server, since it cannot be pushed to device
                $.ajax({
                    type: "POST",
                    url: "http://188.226.226.76/API-test/public/deviceState/" + localStorage.token + "/" + localStorage.systemID + "/" + nwkAddr + "/" + endPoint + "/" + oldValue,
                    dataType: 'json',
                    success: function(){},
                    error: function(){}   
                });                    

//                customAlert('Change has not been pushed home for: ' + failedDevice);
            }                        
        },
        error: function(errorText){
            console.log("Checking of device state failed");
        }   
    });                  
}

// BIND CLICK ACTION TO ALL DEVICE ICONS
//  - ON ICON PRESS NEW DEVICE VALUE WILL BE SENT TO SERVER
//  - ICON AND DATA ATTRIBUTE IS CHANGED
//  - TIMER WILL BE STARTED AND WHEN IT FINISHES VALUE ON SERVER WILL BE CHECKED
//  - IF STATE ON SERVER IS NOT CHANGED:
//          ICON WILL BE REVERTED
//          OLD DEVICE VALUE WILL BE SENT TO SERVER
//  - UPDATE LOCAL DATA BASE
function bindClickActionToIconsOnTheMainScreen(){
    console.log('Binding click events to main screen');
    $$(".device" ).each(function( index ) {
        // ASSIGN BIND ACTIONS TO ALL DEVICES EXEPT TEMPERATURE AND CURTAINS
        if ($$(this).attr("data-deviceID") != "12" && $$(this).attr("data-deviceID") != "512"){
            $$(this).off('click', clickElementFunction).on('click',clickElementFunction); //RADOJKO
        }
    });
}

function clickElementFunction(){
    var dataAttributes = $$(this).dataset();
    var newValue;

    if (dataAttributes.lastvalue == 0){
        newValue = dataAttributes.custommaxvalue;
    } else {
        newValue = 0;
    }
    changeDeviceIconAndAttributes(dataAttributes.nwkaddress, dataAttributes.endpoint, dataAttributes.icon, newValue);
    sendNewDeviceValueToServer(dataAttributes.nwkaddress, dataAttributes.endpoint, newValue, dataAttributes.lastvalue, dataAttributes.icon, 1, 1);    
}

//BIND TAPHOLD ACTON TO ALL ICONS ON THE MAIN SCREEN
//  TAPHOLD ACTION WILL TAKE USER TO DEVICE DETAILS SCREEN
function bindTapholdActionToIconsOnTheMainScreen(){    
    console.log('Binding taphold events to main screen');
    $$(".device" ).each(function( index ) {
        
        //IN ORDER TO AVOID BIND OF SAME EVENT MORE THEN ONE TIME  
        $$(this).off('taphold', tapholdElementFunction).on('taphold',tapholdElementFunction);  //RADOJKO
    });
}

function tapholdElementFunction(){
    var dataAttributes = $$(this).dataset();
    lastClickedDevice = dataAttributes;
    console.log(lastClickedDevice);
    mainView.router.load({url:  'device_details.html?nwkaddress=' + lastClickedDevice.nwkaddress + 
                                '&endpoint=' + lastClickedDevice.endpoint + 
                                '&lastvalue=' + lastClickedDevice.lastvalue + 
                                '&deviceid=' + lastClickedDevice.deviceid + 
                                '&customMaxValue=' + lastClickedDevice.custommaxvalue + 
                                '&icon=' + lastClickedDevice.icon });
    
}

// ******************************************************************************************************************************

function bindOnChangeActionToDimmingSlide(){  
    console.log('Slider is moved');
    changeNeedsToBeSent = true;

    if (timerIDForDimmer != 999){
        clearTimeout(timerIDForDimmer);
    }      

    timerIDForDimmer = setTimeout(function(){
//                    console.log('Sending ' + $$('#dimming-slider').val() + ' to server. Nwk Address: ' + e.detail.page.query.endpoint);
        changeNeedsToBeSent = false;
        sendNewDimmingValueToServer(lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, $$('#dimming-slider').val());          

    }, 1000);
}

// WHEN THE SLIDER IS CHANGED IN DEVICE_DETAILS SCREEN, UPDATE NEEDS TO BE SENT TO SERVER
function sendNewDimmingValueToServer(nwkAddr, endPoint, value){
    $$.ajax({
        type: "POST",
        url: "http://188.226.226.76/API-test/public/deviceState/" + localStorage.token + "/" + localStorage.systemID + "/" + nwkAddr + "/" + endPoint + "/" + value,
        dataType: 'json',

        success: function(data){
            console.log('New customMaxValue' + value + 'is sent to server for device: ' + nwkAddr + ", " + endPoint);
        },
        error: function(errorText){
            console.log("Update failed");
        }   
    });         
}


// ********************************* FUNCTIONS FOR SCHEDULING ***********************************


//CREATE SCHEDULING TABLE IN LOCAL DATABASE
function createSchedulingTable(){
    deviceListDb.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS scheduling(nwkAddr int,endPoint int, startingTime char(5), endingTime char(5), dayPattern int, activated boolean)');
    }, function(err){
        console.log('Error: ' + err.code);
    }, function(){
        console.log('Scheduling table is ready in database');
    }); 
}

//FUNCTION FOR CREATING ONE LINE IN THE EXISTING SCHEDULING CONTAINER ON DEVICE DETAILS SCREEN
function addSchedulingToDeviceDetailsScreen(startingTime, endingTime, dayPattern, activated, i){
    console.log("ADDING DEVICE TO LIST");
    if (startingTime == "null"){
        startingTimeLabel = "<i> --:-- </i>";
    } else{
        startingTimeLabel = startingTime;
    }
    if (endingTime == "null"){
        endingTimeLabel = "<i> --:-- </i>";
    } else {
        endingTimeLabel = endingTime;
    }
    
    //calculate on which days action is repeated
    var repeatsOn="";
    var tempDayPattern  = dayPattern;
    if (tempDayPattern == '31'){
        repeatsOn = "Weekdays";
    } else if (tempDayPattern == '96'){
        repeatsOn = "Weekends"
    } else {
        if (tempDayPattern - 64 >= 0){
            tempDayPattern = tempDayPattern - 64;
            repeatsOn = " Sun";
            $$('#s2'+i).addClass('orange-text');
        }
        if (tempDayPattern - 32 >= 0){
            tempDayPattern = tempDayPattern - 32;
            repeatsOn = " Sut " + repeatsOn;
        }
        if (tempDayPattern - 16 >= 0){
            tempDayPattern = tempDayPattern - 16;
            repeatsOn = " Fri " + repeatsOn;
        }
        if (tempDayPattern - 8 >= 0){
            tempDayPattern = tempDayPattern - 8;
            repeatsOn = " Thu " + repeatsOn;
        }
        if (tempDayPattern - 4 >= 0){
            tempDayPattern = tempDayPattern - 4;
            repeatsOn = " Wed " + repeatsOn;
        }
        if (tempDayPattern - 2 >= 0){
            tempDayPattern = tempDayPattern - 2;
            repeatsOn = " Tus " + repeatsOn;
        }                
        if (tempDayPattern - 1 >= 0){
            tempDayPattern = tempDayPattern - 1;
            repeatsOn = " Mon " + repeatsOn;
        } 
    }
    
    repeatsOn = "Repeats on " + repeatsOn;
    if (dayPattern == 0){
        repeatsOn = "One time schedule";
    }

    //PLACE SCHEDULING LINE ON THE SCREEN
    $$('#existing-schedulings ul').append(
            "<li class='swipeout'>" +
            "  <a href='#' class='swipeout-content item-link item-content' id='scheduling" + i + "'>" +
            "      <div class='item-inner'> " +
            "           <div class='item-title-row'>" +
            "               <div class='item-title'>Scheduled from "+startingTimeLabel+" to "+endingTimeLabel+"</div>" +
            "            </div>" +
            "           <div class='item-subtitle'>" + repeatsOn + "</div>" +
            "        </div>" +
            "    </a>" +
            "    <div class='swipeout-actions-right'>" +
            "        <a href='#' class='delete"+i+" swipeout-delete bg-orange' data-startingtime='"+startingTime+"' data-endingtime='"+endingTime+"'> Delete </a>" +
            "    </div>" +        
            "</li>");
    
    //WHEN SCHEDULING LINE IS CLICKED, TAKE USER TO SCHEDULE EDIT PAGE
    $$('#scheduling'+i).on('click',function(){
        console.log('Line is clicked');
        mainView.router.load({url:  'scheduling.html?editMode=1' + 
                                    '&startingTime=' + startingTime + 
                                    '&endingTime=' + endingTime + 
                                    '&dayPattern=' + dayPattern + 
                                    '&activated=' + activated});   
    })
    
    //WHEN SCHEDULING LINE IS DELETED
    $$('.delete'+i).on('click', function () {  
        var localStartTime = $$(this).data('startingTime');
        var localEndTime = $$(this).data('endingTime');
        console.log(localStartTime + ", " + localEndTime);
        //DELETE ROW FROM LOCAL DATABASE
        deviceListDb.transaction( function(tx){
            tx.executeSql("DELETE FROM scheduling WHERE nwkAddr=? AND endPoint=? AND startingTime=? AND endingTime = ?", [lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, localStartTime, localEndTime], function(tx, results){
                console.log('delete success');
            });
        }); 
        
        $$.ajax({
            type: "POST",
            url: "http://188.226.226.76/API-test/public/removeScheduling/" + localStorage.token + "/" + localStorage.systemID + "/" + lastClickedDevice.nwkaddress + "/" + lastClickedDevice.endpoint + "/" + localStartTime + "/" + localEndTime + "/",
            dataType: 'json',
            success: function(data){
                console.log('Deletion of scheduling has been sent to server');
            },
            error: function(errorText){
                customAlert('Deletion of scheduling failed to been sent to server');
            }
        });         
    });
}

//LOAD EXISTING SCHEDULINGS FROM LOCAL DATABASE
function printSchedulingToDeviceDetailsPage(){
    console.log("Printing existing schedulings");
    $$('#existing-schedulings-container').hide();    
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM scheduling WHERE nwkAddr = ? AND endPoint = ?',[lastClickedDevice.nwkaddress, lastClickedDevice.endpoint], function(tx, result){
            if (result.rows.length > 0){
                $$('#existing-schedulings-container').show();                
                $$('#existing-schedulings ul').text("");
                for (var i = 0; i < result.rows.length; i++){
                addSchedulingToDeviceDetailsScreen(result.rows.item(i).startingTime, result.rows.item(i).endingTime, result.rows.item(i).dayPattern, result.rows.item(i).activated, i);
            }
            }            
        })
    })
}

//GRAB ALL SCHEDULINGS FROM SERVER AND STORE IT IN THE LOCAL DATABASE
function syncSchedulings(deviceListDb){
    $$.ajax({
        type: "GET",
        url: "http://188.226.226.76/API-test/public/getScheduling/" + localStorage.token + "/" + localStorage.systemID,
        dataType: 'json',
        success: function(data){
            console.log('Scheduling data: ');
            console.log(data);
            
            deviceListDb = window.openDatabase('deviceList','','deviceListDB', 500000);            
            deviceListDb.transaction(function(tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS scheduling(nwkAddr int,endPoint int, startingTime char(5), endingTime char(5), dayPattern int, activated boolean)');
            }, function(err){
                console.log('Error: ' + err.code);
            }, function(){
                console.log('Scheduling table is ready in database');
            }); 
            
            deviceListDb.transaction(function(tx) {
                tx.executeSql("DELETE FROM scheduling WHERE 1");
            }, function(){
                console.log('Local scheduling table is cleared');            
            },function () {
                console.log('Error clearing shceduling table in local db');
            });               
            
            deviceListDb.transaction(function(tx) {
                for (var k = 0; k < data.data.length; k++){
                    tx.executeSql("INSERT INTO scheduling(nwkAddr,endPoint, startingTime, endingTime, dayPattern, activated) VALUES (?,?,?,?,?,?)",[ data.data[k].networkAddress, data.data[k].endPoint, data.data[k].startTime, data.data[k].endTime, data.data[k].dayPattern, data.data[k].activateDeactivate]);
                }
            }, function (err) {
                console.log('Error in SQL query: ' + err.code);
            });  
        },
        error: function(errorText){
            customAlert('Sync of shceduling failed');
        }
    });
}

//GRAB ALL BINDINGS FROM SERVER AND STORE IT IN THE LOCAL DATABASE
function syncBindings(deviceListDb){
    $$.ajax({
        type: "GET",
        url: "http://188.226.226.76/API-test/public/getBindings/" + localStorage.token + "/" + localStorage.systemID,
        dataType: 'json',
        success: function(data){
            console.log('Binding data: ');
            console.log(data);
            
            deviceListDb = window.openDatabase('deviceList','','deviceListDB', 500000);
            deviceListDb.transaction(function(tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS bindings(srcEndPoint int, srcNwkAddr int, destEndPoint int, destNwkAddr int, cluster int)');
            }, function(err){
                console.log('Error: ' + err.code);
            }, function(){
                console.log('Binding table is ready in database');
            });            
            
            deviceListDb.transaction(function(tx) {
                tx.executeSql("DELETE FROM bindings WHERE 1");
            }, function(){
                console.log('Local bindings table is cleared');            
            },function () {
                console.log('Error clearing bindings table in local db');
            });    
            
            deviceListDb.transaction(function(tx) {
                for (var k = 0; k < data.data.length; k++){
                    tx.executeSql("INSERT INTO bindings(srcEndPoint, srcNwkAddr, destEndPoint, destNwkAddr, cluster) VALUES (?,?,?,?,?)",[ data.data[k].srcEndPoint, data.data[k].srcNwkAddr, data.data[k].destEndPoint, data.data[k].destNwkAddr, data.data[k].clusterID]);
                }
            }, function (err) {
                console.log('Error in SQL query: ' + err.code);
            });  
        },
        error: function(errorText){
            alert('Sync of bindings failed');
        }
    });
}

//CONTROL SCHEDULING ICON ON MAIN SCREEN IN CASE THAT THERE IS A SCHEDUL FOR CERTAIN DEVICE
function updateScheduleIcons(){
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM scheduling WHERE 1',[], function(tx, result){ 
            for (i = 0; i < result.rows.length; i++){
                $$("[data-nwkaddress='"+result.rows.item(i).nwkAddr+"'][data-endpoint='"+result.rows.item(i).endPoint+"'] .scheduling-icon").show();
            }

        }), function(err){
            console.log('There was a problem fetching data from local SQL database ' + err.code);
        };
    });             
}




// ********************************* FUNCTIONS FOR NEW PENDING DEVICES FROM SERVER ***********************************

//ADDING CONTENT TO SWIPER (SLIDE) DEPENDING ON NUMBER OF END-POINT OF PENDING DEVICE
function addContentToSwiper(nwkAddr, endPoint, deviceID, swiperID, icon, localTime){
    $$('.swiper-wrapper').append(
        "<div class='swiper-slide' id='swiper-" + swiperID + "' data-nwkaddress="+nwkAddr+" data-endpoint="+endPoint+" data-deviceid="+deviceID+" data-icon="+icon+">" +   
        "    <div class='list-block'>" +   
        "        <ul>" +   
        "            <li class='item-content'>" +   
        "                <div class='item-inner'>" +   
        "                    <div class='item-title'>" +   
        "                        Icon" +   
        "                    </div>" +    
        "                    <div class='item-after'>" +   
        "                        <img class='item-after-icon' src='img/devices/"+icon+"-ON.png'></img>" +   
        "                    </div>" +   
        "                </div>" +   
        "            </li>" +   
        "        </ul>" +   
        "    </div>" +      
        "    <div class='list-block'>" +   
        "        <ul>" +   
        "            <li class='item-content'>" +   
        "                <div class='item-inner'>" +   
        "                    <div class='item-title'>" +   
        "                        Device name" +   
        "                    </div>" +   
        "                    <div class='item-input'>" +   
        "                        <input type='text' id='device-name-input' placeholder='Device room'>" +   
        "                    </div>" +   
        "                </div>" +   
        "            </li>" +            
        "            <li class='item-content'>" +   
        "                <div class='item-inner'>" +   
        "                    <div class='item-title'>" +   
        "                        Device room" +   
        "                    </div>" +   
        "                    <div class='item-input'>" +   
        "                        <input type='text' id='device-room-input' placeholder='Device name'>" +   
        "                    </div>" +   
        "                </div>" +   
        "            </li>" +   
        "        </ul>" +         
        "    </div>" +   
        "    <div class='list-block'>" +   
        "        <ul>" +   
        "            <li class='item-content'>" +   
        "                <div class='item-inner'>" +   
        "                    <div class='item-title label'>Add to favourites</div>" +   
        "                    <div class='item-input'>" +   
        "                        <label class='label-switch'>" +   
        "                            <input type='checkbox' id='favourites'>" +   
        "                            <div class='checkbox'></div>" +   
        "                        </label>" +   
        "                    </div>" +   
        "                </div>" +   
        "            </li>" +            
        "        </ul>" +   
        "   </div>"+
        "   <p>Device added on: " + localTime + "</p>" +
        "</div>");
}

function handleNewDevicesFromServer(data){
    if (data.length == 0){
        //NO PEDNGIN NEW DEVICES ON SERVER        
    } else {
        for (var i = 0; i < data.length; i++){
            console.log('Adding new content to mySwiper');
            
            switch (data[i].deviceID){
                case '512':
                    icon = "Curtains";
                    break;
                case '256':
                    icon = "Light";
                    break;
                case '257':
                    icon = "Light";
                    break;
                case '513':
                    icon = "Boiler";
                    break;
                case '6':
                    icon = "Remote";
                    break;
            }
            timeFromServer = data[i].dateOfLastChange;
//            console.log('Server time: ' + timeFromServer);     
            localTimeTemp = string = timeFromServer.substr(5,5) + '/' + timeFromServer.substr(0,4) + ' ' + timeFromServer.substr(11,8);
            localTime = new Date(localTimeTemp.replace('-','/') + ' UTC');
//            console.log('Timer: ' + localTimer.toLocaleString().substr(0,24));
//            console.log('Local time fromt: ' + localTimeFormat.replace('-','/') + ' UTC');
//            console.log('Local time: ' + localTime);
            addContentToSwiper(data[i].nwkAddress, data[i].endPoint, data[i].deviceID, i, icon, localTime);            
        }
        
        //INITIALIZING SWIPER
        console.log('Initializing mySwiper');
        mySwiper = myApp.swiper('.swiper-container', {
            speed: 400,
            spaceBetween: 70,
            pagination:'.swiper-pagination'
        });   
    }
}

function addNewDeviceToSystem(nwkAddress, deviceID, endPoint, deviceName, deviceRoom, favourites, icon, swiper){    
    if (  deviceRoom != '' && deviceName != '' ){   
        console.log("INSERT INTO deviceList(nwkAddr, endPoint, deviceID, lastValue, customMaxValue, userTag, room, favourites, icon, pushedToUI) VALUES (?,?,?,0,100,?,?,?,0)" + " " +nwkAddress + " " + endPoint+ " " + deviceID+ " " +  deviceName+ " " + deviceRoom+ " " + favourites+ " " + icon);
        $$.ajax({
                type: "POST",
                url: "http://188.226.226.76/API-test/public/updateDeviceDetails/" + localStorage.token + "/" + localStorage.systemID +"/" + nwkAddress + "/" + deviceID +"/" + endPoint + "/" + deviceName + "/" + deviceRoom + "/100/" + favourites + "/" + icon,
                dataType: 'json',
                success: function(data){
                    
                    deviceListDb.transaction(function(tx) {
                        tx.executeSql("INSERT INTO deviceList(nwkAddr, endPoint, deviceID, lastValue, customMaxValue, userTag, room, favourites, icon, pushedToUI) VALUES (?,?,?,0,100,?,?,?,?,0)",[nwkAddress, endPoint, deviceID,  deviceName, deviceRoom, favourites, icon]);
                    }, function(err) {
                        console.log('Error adding new device to lacalDatabase: ' + err.code);
                    }, function(){
                        console.log('New device has been added to localDatabase');
                        mySwiper.removeSlide(swiper);
                        
                        //REMOVE SWIPER CONTAINER IF THERE ARE NO NEW DEVICES TO BE ADDED
                        if ($$('.swiper-wrapper .swiper-slide').length == 0){
                            $$('.swiper-container').hide();
                            $$('#allow-adding-new-device').show();
                        }
                        
                    });
                    
                },
                error: function(errorText){
                    alert('Update for new device failed to been sent to server');
                }
        });
    } else {
        alert('Fill all required inputs');
    }    
 
}

function addNewDeviceButton(){
    var activeSlide =  mySwiper.activeIndex;
    
    deviceName = $$('#swiper-'+activeSlide+" #device-name-input").val();
    deviceRoom = $$('#swiper-'+activeSlide+" #device-room-input").val().replace(' ','__');
    
    var favourites = 0
    if ($$('#swiper-1 #favourites').is(':checked')){
        favourites = 1;
    }
    
    nwkAddress = $$('#swiper-'+activeSlide).attr('data-nwkaddress');
    endPoint = $$('#swiper-'+activeSlide).attr('data-endpoint');
    deviceID = $$('#swiper-'+activeSlide).attr('data-deviceid');
    icon = $$('#swiper-'+activeSlide).attr('data-icon');

    addNewDeviceToSystem(nwkAddress, deviceID, endPoint, deviceName, deviceRoom, favourites, icon, activeSlide);
}

//CHECK IF THERE ARE SOME PENDING DEVICES ON SERVER THAT WAITS TO BE ADDED
function checkForNewDevices(timerID){
    $$.ajax({
        type: "GET",
        url: "http://188.226.226.76/API-test/public/addNewDevice/" + localStorage.token + "/" + localStorage.systemID,

        dataType: 'json',
        success: function(data){  
            console.log(data);
            console.log(data.data.length);
            if (data.data.length > 0){     
                $$('#allow-adding-new-device').hide();                         
                $$('.swiper-container').show(); 
                //TURN OFF ALLOW JOINING NA SERVERU
                console.log('JOINING DISALLOWED');
                disallowJoining();                
                //TURNINO OFF PERIODCALY CALLBACK OF FUNCTION CHECKFORNEWDEVICES                
                if (timerID != 999){
                    console.log('Reseting timer');
                    console.log(timerID);                
                    clearInterval(timerID);
                    timerID = 999;
                } else {
                    console.log('No timer to reset');
                }
                
                handleNewDevicesFromServer(data.data);
            } else {
                console.log('No new pending devices from server');
                $$('#allow-adding-new-device').show();         
                $$('.swiper-container').hide(); 
            }
        }
    });    
}

function disallowJoining(){
    $$.ajax({
        type: "POST",
        url: "http://188.226.226.76/API-test/public/disallowJoining/" + localStorage.token + "/" + localStorage.systemID,

        dataType: 'json',
        success: function(){
            console.log('Joining on server turned OFF');
        }
    });
}

function allowJoining(){
    $$.ajax({
        type: "POST",
        url: "http://188.226.226.76/API-test/public/allowJoining/" + localStorage.token + "/" + localStorage.systemID,

        dataType: 'json',
        success: function(){
            console.log('Joining on server turned ON');
        }
    });
}


//*********************************** BINDING FUNCTIONS ************************************************************************

function clearSelectionFromUpperTable(){
    console.log('Clearing all from upper table');
    $$('#triggering-device-list .item-content').css('background-color','transparent');
    $$('#triggering-device-list .item-content .fifth').html('');
}

function clearSelectionFromLowerTable(){
    console.log('Clearing all from lower table');
    $$('#targeted-device-list .item-content').css('background-color','transparent');
    $$('#targeted-device-list .item-content .fifth').html('');
    arrayOfSelectedTargets = [];
}    

function clearAllSelectionInTables(){
    console.log('Clearing all from all tables');
    $$('.item-content').css('background-color','transparent');
    $$('.item-content .fifth').html('');
    arrayOfSelectedTargets = [];
}

function bindActionsToTableRows(){

    
    $$('.binding-devices-list-group .item-content').on('click', function(){
        if ( $$(this).css('background-color') != 'rgb(46, 62, 68)' ){
            //ROW WAS NOT SELECTED -- ROW SELECTION
            if ( $$(this).parent().attr('id') == 'triggering-device-list'){                                        
                //upper device List
                clearAllSelectionInTables();
                $$(this).css('background-color','rgb(46, 62, 68)');  

                console.log(this);
                selectedTrigger = {nwkAddr: $$(this).attr('data-nwkaddress'), endPoint: $$(this).attr('data-endpoint') };
                console.log(" SelectedTrigger: " + selectedTrigger.endPoint + "," + selectedTrigger.nwkAddr);
                
                //SHOW ALL DEVICES THAT ARE TRIGGERED WITH SELECTED TRIGGER
                for (var i = 0; i < bindSource.length; i++){
                    if (bindSource[i].nwkAddr == selectedTrigger.nwkAddr && bindSource[i].endPoint == selectedTrigger.endPoint){
                        //grab all elements from lower table                        
                        $$("#targeted-device-list [data-nwkaddress='"+bindDest[i].nwkAddr+"'][data-endpoint='"+bindDest[i].endPoint+"'] .fifth").text('B');
//                        $$('td:last-child',this).html('B');
                    }
                }

            } else {                    
                //LOWER DEVICE LIST
                $$(this).css('background-color','rgb(46, 62, 68)');                    

                selectedTarget = {nwkAddr: $$(this).attr('data-nwkaddress'), endPoint: $$(this).attr('data-endpoint') };
                arrayOfSelectedTargets.push(selectedTarget);
            }
        } else {
            // ROW WAS SELECTED -- ROW DISSELECTION
            if ( $$(this).parent().parent().attr('id') == 'triggering-device-list'){

                //UPPER DEVICE LIST
                clearSelectionFromLowerTable();
                selectedTrigger = {nwkAddr: 0, endPoint: 0 };
                console.log(selectedTrigger);

            } else {
                //LOWER DEVICE LIST
                targetToBeRemoved = {nwkAddr: $$(this).attr('data-nwkaddress'), endPoint: $$(this).attr('data-endpoint') };            

                indexOfElementThatNeedsToBeRemoved =  -1;
                for( var i = 0; i < arrayOfSelectedTargets.length; i++){
                    if (arrayOfSelectedTargets[i].nwkAddr == targetToBeRemoved.nwkAddr && arrayOfSelectedTargets[i].endPoint == targetToBeRemoved.endPoint){
                        indexOfElementThatNeedsToBeRemoved = i;
                    }                        
                    break;
                }

                arrayOfSelectedTargets.splice(indexOfElementThatNeedsToBeRemoved,1);

            }

            $$(this).css('background-color','transparent');
        }
        console.log('Array of selected targets: ');
        console.log(arrayOfSelectedTargets);
        for (j = 0; j < arrayOfSelectedTargets.length; j++){
            if ( $$("#targeted-device-list [data-nwkaddress='"+arrayOfSelectedTargets[j].nwkAddr+"'][data-endpoint='"+arrayOfSelectedTargets[j].endPoint+"'] .fifth").html() == 'B' ){
                bindPresent = 1;
            }
            if ( $$("#targeted-device-list [data-nwkaddress='"+arrayOfSelectedTargets[j].nwkAddr+"'][data-endpoint='"+arrayOfSelectedTargets[j].endPoint+"'] .fifth").html() == '' ){
                bindNotPresent = 1;
            }                                
        }

        if (bindPresent == '1' && bindNotPresent == '0'){
            $$('#save-button-bindings span').html('Unbind');
        } else if (bindPresent == '0' && bindNotPresent == '1'){
            $$('#save-button-bindings span').html('Bind');
        } else {
            $$('#save-button-bindings span').html('');
        }
        console.log('Bind present: '+bindPresent+'; bindNotPresent: '+bindNotPresent);
        bindPresent = 0;
        bindNotPresent = 0;                        
    });     
}    

function sendBindingToServer(triggeringDevice, targetedDevice, cluster, bindUnbind){
    $$.ajax({
        type: "POST",
        url: "http://188.226.226.76/API-test/public/addBinding/" + localStorage.token + "/" + localStorage.systemID + "/" + triggeringDevice.endPoint + "/" +  triggeringDevice.nwkAddr + "/" + targetedDevice.endPoint + "/" + targetedDevice.nwkAddr + "/" + cluster +"/" + bindUnbind, 
        dataType: 'json',
        success: function(data){
        },
        error: function(errorText){
        }   
    });
}

function addBindingToLocalDB(triggeringDevice, targetedDevice, cluster){
    deviceListDb.transaction(function(tx) {
        tx.executeSql("INSERT INTO bindings(srcEndPoint, srcNwkAddr, destEndPoint, destNwkAddr, cluster) VALUES (?,?,?,?,?)",[triggeringDevice.endPoint, triggeringDevice.nwkAddr, targetedDevice.endPoint, targetedDevice.nwkAddr, cluster]);
    }, function (err) {
        console.log('Error in SQL query: ' + err.code);
    }, function () {
        console.log('New Binding added to local database');
    });
}

function removeBindingToLocalDB(triggeringDevice, targetedDevice, cluster){
    deviceListDb.transaction(function(tx) {
        tx.executeSql("DELETE FROM bindings WHERE srcEndPoint = ? AND srcNwkAddr = ? AND destEndPoint = ? AND destNwkAddr = ? AND cluster = ?",[triggeringDevice.endPoint, triggeringDevice.nwkAddr, targetedDevice.endPoint, targetedDevice.nwkAddr, cluster]);
    }, function (err) {
        console.log('Error in SQL query: ' + err.code);
    });                
}


// ********************************* FUNCTIONS FOR BINDING EVENTS **************************************************************

function sidePanelBindingsFunction(){
    myApp.closePanel();
    setTimeout(function(){
        mainView.router.load({url: 'bindings.html'});
    }, 200);    
}

function sidePanelAddNewDeviceFunction(){
    myApp.closePanel();
    setTimeout(function(){
        mainView.router.load({url: 'add_new_device.html'});
    }, 200);    
}

function sidePanelSyncFunction(){
    myApp.closePanel();

    //GRAB DEVICE LIST FROM SERVER
    grabAllDeviceDataFromServer();

    //GRAB BINDINGS FROM SERVER
    syncBindings();

    //GRAB SCHEDULINGS FROM SERVER
    syncSchedulings(deviceListDb);    
}

function sidePanelLogutFunction(){
    myApp.closePanel();                       
    dropTableInLocalDatabase('deviceList');
    dropTableInLocalDatabase('scheduling');
//            dropTableInLocalDatabase('bindings');

    console.log("SIDE PANEL: CREARING ALL LOCASTORAGE");
    localStorage.clear(); 
    mainView.router.load({url: 'login.html'});    
}

function sidePanelLHelpFunction(){
    myApp.closePanel();
    setTimeout(function(){
        mainView.router.load({url: 'help.html'});
    }, 200);      
}

function curtainUpButtonClick(){
    sendNewDeviceValueToServer(lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, 150, 100, "Curtains", 0, 0);
}

function curtainStopButtonClick(){
    sendNewDeviceValueToServer(lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, 200, 100, "Curtains", 0, 0);
}

function curtainDownButtonClick(){
    sendNewDeviceValueToServer(lastClickedDevice.nwkaddress, lastClickedDevice.endpoint, 250, 100, "Curtains", 0, 0);
}

function selectBindingSourceLine(){
    console.log('Background is changed for line' + $$(this).data("nwkaddr"));
    
    if ($$(this).css('background-color') == 'rgba(0, 0, 0, 0)'){
        $$('#possible-bind-devices li').css('background-color','rgba(0, 0, 0, 0)');
        if (localStorage.getItem('bindSourceNwkAddr') != null){
            localStorage.removeItem('bindSourceNwkAddr');
            localStorage.removeItem('bindSourceEndPoint');
        }
        
        
        //SELECT ROW
        $$(this).css('background-color','rgba(46, 62, 68, 1)');
        localStorage.bindSourceNwkAddr = $$(this).data("nwkaddr");
        localStorage.bindSourceEndPoint = $$(this).data("endpoint");
    } else {
        $$('#possible-bind-devices li').css('background-color','rgba(0, 0, 0, 0)');   
        if (localStorage.getItem(bindSourceNwkAddr) != null){
            localStorage.removeItem('bindSourceNwkAddr');
            localStorage.removeItem('bindSourceEndPoint');
        }
    }
}

function openBindingPickerForUp(){
    $$("#save-selected-device-for-binding").off('click',bindToSelectedBindingSourceForCurrtainDown);  
    $$("#save-selected-device-for-binding").off('click',bindToSelectedBindingSourceForCurrtainUp).on('click',bindToSelectedBindingSourceForCurrtainUp);    
    myApp.pickerModal(".binder-picker");
}

function openBindingPickerForDown(){
    $$("#save-selected-device-for-binding").off('click',bindToSelectedBindingSourceForCurrtainUp);    
    $$("#save-selected-device-for-binding").off('click',bindToSelectedBindingSourceForCurrtainDown).on('click',bindToSelectedBindingSourceForCurrtainDown);    
    myApp.pickerModal(".binder-picker");
}

function openBindingPickerForOther(){
    $$("#save-selected-device-for-binding").off('click',bindToSelectedBindingSourceForOther).on('click',bindToSelectedBindingSourceForOther);    
    myApp.pickerModal(".binder-picker");
}

function bindToSelectedBindingSourceForCurrtainUp(){    
    bindToSelectedBindingSource(10);
}

function bindToSelectedBindingSourceForCurrtainDown(){
    bindToSelectedBindingSource(12);
}

function bindToSelectedBindingSourceForOther(){
    bindToSelectedBindingSource(6);
}

// ***********************************  DEVICE_BINDING FUNCTION   ****************************************************************

function bindToSelectedBindingSource(cluster){
    myApp.closeModal('.binder-picker');
    
    bindUnbind = 'bind';
    triggeringDevice = {nwkAddr: localStorage.bindSourceNwkAddr, endPoint: localStorage.bindSourceEndPoint};
    targetedDevice = {nwkAddr: lastClickedDevice.nwkaddress, endPoint: lastClickedDevice.endpoint};
    
    deviceListDb.transaction(function(tx){
        tx.executeSql('SELECT * FROM bindings WHERE srcNwkAddr = ? AND srcEndPoint = ? AND destEndPoint = ? AND destNwkAddr = ? AND cluster = ?', [localStorage.bindSourceNwkAddr, localStorage.bindSourceEndPoint, lastClickedDevice.endpoint, lastClickedDevice.nwkaddress, cluster], function(tx, results){

            //CHECK IF BINDING ALREADY EXISTS
            if(results.rows.length == 0){

                sendBindingToServer(triggeringDevice, targetedDevice, cluster, bindUnbind);

                addBindingToLocalDB(triggeringDevice, targetedDevice, cluster);

                //ADD RECENTLY ADDED BINDING TO EXISTING LIST
                deviceListDb.transaction(function(tx2){
                    tx2.executeSql('SELECT * FROM deviceList WHERE nwkAddr = ? AND endPoint = ?', [localStorage.bindSourceNwkAddr, localStorage.bindSourceEndPoint], function(tx2, results2){
                        //DEFINE BINDED BUTTON ON SWITCH OR REMOTE
                        buttonNumber = 1;
                        if (results2.rows.item(0).deviceID == '6'){ //REMOTE
                            buttonNumber = results2.rows.item(0).endPoint -20 + 1;
                        }
                        if (results2.rows.item(0).deviceID == '259'){ //WALL SWITCH
                            buttonNumber = results2.rows.item(0).endPoint - 5 + 1;
                        }                        

                        //ADD NEW LINE INTO EXISTING CONNECTIONS TABLE  
                        addNewBindingRowToExistingDeviceBinginsList(triggeringDevice, targetedDevice, results2.rows.item(0).userTag, results2.rows.item(0).room, buttonNumber, results2.rows.item(0).icon, cluster, $$('#existing-device-bindings li').length);
                    });
                });

            } else {
                alert("Binding already in the list");
            }
        });
    }); 
}

//FUNCTION THAT HANDLES ADDING NEW LINE INTO EXISTING_BINDINS_LIST AND BINDS DELETE FUNCTIONS
function addNewBindingRowToExistingDeviceBinginsList(triggeringDevice, targetedDevice, userTag, room, buttonNumber, icon, cluster, itemNumber){
    $$('#existing-device-bindings ul').append(
        "<li class='swipeout'>" +
        "   <div class='item-content'>" +                          
        "         <div class='item-media'><img class='connection-icon' src='img/devices/"+ icon+"-ON.png'/></div>" +
        "         <div class='item-inner'> " +
        "             <div class='item-title connection-title'>"+userTag+ " (" + buttonNumber +")</div>" +
        "         <div class='item-after connection-title'>"+room+"</div>" +
        "   </div>" +
        "   <div class='swipeout-actions-right'>" +
        "       <a href='#' class='delete-binding"+itemNumber+" swipeout-delete bg-orange' data-srcendpoint='"+triggeringDevice.endPoint+"' data-srcnwkaddr='"+triggeringDevice.nwkAddr+"' data-destendpoint='"+targetedDevice.endPoint+"' data-destnwkaddr='"+targetedDevice.nwkAddr+"' data-cluster='"+cluster+"'> Delete </a>" +
        "   </div>" +        
        "</li>");
    $$('.content-block-title').html('EXISTING CONNECTIONS');
    $$('#existing-device-bindings').show();


    //WHEN SCHEDULING LINE IS DELETED
    $$('.delete-binding'+itemNumber).on('click', function () {  
        //DELETE BINDING FROM LOCAL DATABASE
        deviceListDb.transaction( function(tx){
            tx.executeSql("DELETE FROM bindings WHERE srcNwkAddr = ? AND srcEndPoint = ? AND destEndPoint = ? AND destNwkAddr = ? AND cluster = ?", [triggeringDevice.nwkAddr, triggeringDevice.endpoint, targetedDevice.endPoint, targetedDevice.nwkAddr, cluster], function(tx, results){
                console.log('Binding deleted from local database');
            });
        }); 
        //DELETE BINDING FROM SERVER
        sendBindingToServer(triggeringDevice, targetedDevice, cluster, 'unbind');
        if($$('#existing-device-bindings li').length == 1){
            $$('.content-block-title').html('');
            $$('#existing-device-bindings').hide();
        }
    });     
    
}

//FUNCTION THAT SOLVES PROBLEM WITH ASYNC SQLITE TRANSACTIONS FOR FILLING THE LIST OF EXISTING BINDINGS
function helpFunctinoForAddingBindingRow(tempNwkAddr, tempEndPoint){        
    deviceListDb.transaction(function(tx2){
        tx2.executeSql('SELECT * FROM deviceList WHERE nwkAddr = ? AND endPoint = ?', [tempNwkAddr, tempEndPoint], function(tx2, results2){
            //DEFINE BINDED BUTTON ON SWITCH OR REMOTE
            console.log('TEST2: ' + tempNwkAddr + "," + tempEndPoint);

            buttonNumber = 1;
            if (results2.rows.item(0).deviceID == '6'){ //REMOTE
                buttonNumber = results2.rows.item(0).endPoint -20 + 1;
            }
            if (results2.rows.item(0).deviceID == '259'){ //WALL SWITCH
                buttonNumber = results2.rows.item(0).endPoint - 5 + 1;
            }     

            //ADD NEW LINE INTO EXISTING CONNECTIONS TABLE
            addNewBindingRowToExistingDeviceBinginsList({nwkAddr: tempNwkAddr,endPoint: tempEndPoint}, {nwkAddr: lastClickedDevice.nwkaddress ,endPoint: lastClickedDevice.endpoint}, results2.rows.item(0).userTag, results2.rows.item(0).room, buttonNumber, results2.rows.item(0).icon, cluster, i);                
        })
    })         
}















