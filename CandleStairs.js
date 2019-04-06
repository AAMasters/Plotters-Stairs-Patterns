function newAAMastersPlottersStairsPatternsCandleStairs() {

    const MODULE_NAME = "AAMasters Plotters Stairs Patterns Candle Stairs";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const INTENSIVE_LOG = false;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        /* Events declared outside the plotter. */

        onDailyFileLoaded: onDailyFileLoaded, 

        // Main functions and properties.

        initialize: initialize,
        finalize: finalize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        recalculateScale: recalculateScale, 
        draw: draw,

        // Secondary functions and properties.

        currentStair: undefined
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let timeLineCoordinateSystem = newTimeLineCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let marketFiles;                      // This object will provide the different Market Files at different Time Periods.
    let dailyFiles;                // This object will provide the different File Cursors at different Time Periods.

    /* these are module specific variables: */

    let stairsArray = [];              // Here we keep the candle-stairs to be ploted every time the Draw() function is called by the AAWebPlatform.

    return thisObject;

    function finalize() {
        try {

            if (INFO_LOG === true) { logger.write("[INFO] finalize -> Entering function."); }

            /* Stop listening to the necesary events. */

            viewPort.eventHandler.stopListening("Zoom Changed", onZoomChanged);
            viewPort.eventHandler.stopListening("Offset Changed", onOffsetChanged);
            marketFiles.eventHandler.stopListening("Files Updated", onFilesUpdated);
            canvas.eventHandler.stopListening("Drag Finished", onDragFinished);

            /* Destroyd References */

            marketFiles = undefined;
            dailyFiles = undefined;

            datetime = undefined;
            timePeriod = undefined;

            marketFile = undefined;
            fileCursor = undefined;

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] finalize -> err.message = " + err.message); }
        }
    }

    function initialize(pStorage, pExchange, pMarket, pDatetime, pTimePeriod, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

            /* Store the information received. */

            marketFiles = pStorage.marketFiles[0];
            dailyFiles = pStorage.dailyFiles[0];

            datetime = pDatetime;
            timePeriod = pTimePeriod;

            /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

            marketFile = marketFiles.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

            recalculateScale();

            /* Now we set the right files according to current Period. */

            marketFile = marketFiles.getFile(pTimePeriod);
            fileCursor = dailyFiles.getFileCursor(pTimePeriod);

            /* Listen to the necesary events. */

            viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);
            viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);
            marketFiles.eventHandler.listenToEvent("Files Updated", onFilesUpdated);
            canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);

            /* Get ready for plotting. */

            recalculate();

            callBackFunction();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err); }
            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);

        }
    }

    function getContainer(point) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] getContainer -> Entering function."); }

            let container;

            /* First we check if this point is inside this space. */

            if (this.container.frame.isThisPointHere(point) === true) {

                return this.container;

            } else {

                /* This point does not belong to this space. */

                return undefined;
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] getContainer -> err = " + err); }
         
        }
    }

    function onFilesUpdated() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onFilesUpdated -> Entering function."); }

            let newMarketFile = marketFiles.getFile(timePeriod);

            if (newMarketFile !== undefined) {

                marketFile = newMarketFile;
                recalculate();
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onFilesUpdated -> err.message = " + err.message); }
        }
    }

    function setTimePeriod(pTimePeriod) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] setTimePeriod -> Entering function."); }

            if (timePeriod !== pTimePeriod) {

                timePeriod = pTimePeriod;

                if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                    let newMarketFile = marketFiles.getFile(pTimePeriod);

                    if (newMarketFile !== undefined) {

                        marketFile = newMarketFile;
                        recalculate();
                    }

                } else {

                    let newFileCursor = dailyFiles.getFileCursor(pTimePeriod);

                    if (newFileCursor !== undefined) {

                        fileCursor = newFileCursor;
                        recalculate();
                    }
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] setTimePeriod -> err = " + err); }

        }
    }

    function setDatetime(pDatetime) {

        if (INFO_LOG === true) { logger.write("[INFO] setDatetime -> Entering function."); }

        datetime = pDatetime;

    }

    function onDailyFileLoaded(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDailyFileLoaded -> Entering function."); }

            if (event.currentValue === event.totalValue) {

                /* This happens only when all of the files in the cursor have been loaded. */

                recalculate();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFileLoaded -> err = " + err); }

        }
    }

    function draw() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] onDailyFileLoaded -> Entering function."); }

            this.container.frame.draw();

            plotChart();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] draw -> err = " + err); }

        }
    }

    function recalculate() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculate -> Entering function."); }

            if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                recalculateUsingMarketFiles();

            } else {

                recalculateUsingDailyFiles();

            }

            thisObject.container.eventHandler.raiseEvent("CandleStairs Changed", stairsArray);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculate -> err = " + err); }

        }
    }

    function recalculateUsingDailyFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingDailyFiles -> Entering function."); }

            if (fileCursor === undefined) { return; } // We need to wait

            if (fileCursor.files.size === 0) { return; } // We need to wait until there are files in the cursor

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, timeLineCoordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            let farLeftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            let farRightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            let currentDate = new Date(farLeftDate.valueOf());

            stairsArray = [];

            while (currentDate.valueOf() <= farRightDate.valueOf() + ONE_DAY_IN_MILISECONDS) {

                let stringDate = currentDate.getFullYear() + '-' + pad(currentDate.getMonth() + 1, 2) + '-' + pad(currentDate.getDate(), 2);

                let dailyFile = fileCursor.files.get(stringDate);

                if (dailyFile !== undefined) {

                    for (let i = 0; i < dailyFile.length; i++) {

                        let stairs = {
                            open: undefined,
                            close: undefined,
                            min: 10000000000000,
                            max: 0,
                            begin: undefined,
                            end: undefined,
                            direction: undefined,
                            candleCount: 0,
                            firstMin: 0,
                            firstMax: 0,
                            lastMin: 0,
                            lastMax: 0
                        };

                        stairs.open = dailyFile[i][0];
                        stairs.close = dailyFile[i][1];

                        stairs.min = dailyFile[i][2];
                        stairs.max = dailyFile[i][3];

                        stairs.begin = dailyFile[i][4];
                        stairs.end = dailyFile[i][5];

                        stairs.direction = dailyFile[i][6];
                        stairs.candleCount = dailyFile[i][7];

                        stairs.firstMin = dailyFile[i][8];
                        stairs.firstMax = dailyFile[i][9];

                        stairs.lastMin = dailyFile[i][10];
                        stairs.lastMax = dailyFile[i][11];

                        if (stairs.begin >= farLeftDate.valueOf() && stairs.end <= farRightDate.valueOf()) {

                            stairsArray.push(stairs);

                            if (datetime.valueOf() >= stairs.begin && datetime.valueOf() <= stairs.end) {

                                thisObject.currentStair = stairs;
                                thisObject.container.eventHandler.raiseEvent("Current Candle-Stairs Changed", thisObject.currentStair);

                            }
                        }
                    }
                }

                currentDate = new Date(currentDate.valueOf() + ONE_DAY_IN_MILISECONDS);
            }

            /* Lests check if all the visible screen is going to be covered by candle-stairs. */

            let lowerEnd = leftDate.valueOf();
            let upperEnd = rightDate.valueOf();

            if (stairsArray.length > 0) {

                if (stairsArray[0].begin > lowerEnd || stairsArray[stairsArray.length - 1].end < upperEnd) {

                    setTimeout(recalculate, 2000);

                    //console.log("File missing while calculating candle-stairs, scheduling a recalculation in 2 seconds.");

                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingDailyFiles -> err = " + err); }

        }
    }

    function recalculateUsingMarketFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingMarketFiles -> Entering function."); }

            if (marketFile === undefined) { return; } // Initialization not complete yet.

            let daysOnSides = getSideDays(timePeriod);

            let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem);
            let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, timeLineCoordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            leftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            rightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            stairsArray = [];

            for (let i = 0; i < marketFile.length; i++) {

                let stairs = {
                    open: undefined,
                    close: undefined,
                    min: 10000000000000,
                    max: 0,
                    begin: undefined,
                    end: undefined,
                    direction: undefined,
                    candleCount: 0,
                    firstMin: 0,
                    firstMax: 0,
                    lastMin: 0,
                    lastMax: 0
                };

                stairs.open = marketFile[i][0];
                stairs.close = marketFile[i][1];

                stairs.min = marketFile[i][2];
                stairs.max = marketFile[i][3];

                stairs.begin = marketFile[i][4];
                stairs.end = marketFile[i][5];

                stairs.direction = marketFile[i][6];
                stairs.candleCount = marketFile[i][7];

                stairs.firstMin = marketFile[i][8];
                stairs.firstMax = marketFile[i][9];

                stairs.lastMin = marketFile[i][10];
                stairs.lastMax = marketFile[i][11];

                if (stairs.begin >= leftDate.valueOf() && stairs.end <= rightDate.valueOf()) {

                    stairsArray.push(stairs);

                    if (datetime.valueOf() >= stairs.begin && datetime.valueOf() <= stairs.end) {

                        thisObject.currentStair = stairs;
                        thisObject.container.eventHandler.raiseEvent("Current Candle-Stairs Changed", thisObject.currentStair);

                    }
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingMarketFiles -> err = " + err); }

        }
    }

    function recalculateScale() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateScale -> Entering function."); }

            if (marketFile === undefined) { return; } // We need the market file to be loaded to make the calculation.

            if (timeLineCoordinateSystem.maxValue > 0) { return; } // Already calculated.

            let minValue = {
                x: EARLIEST_DATE.valueOf(),
                y: 0
            };

            let maxValue = {
                x: MAX_PLOTABLE_DATE.valueOf(),
                y: nextPorwerOf10(USDT_BTC_HTH) / 4 // TODO: This 4 is temporary
            };


            timeLineCoordinateSystem.initialize(
                minValue,
                maxValue,
                thisObject.container.frame.width,
                thisObject.container.frame.height
            );

            function getMaxRate() {

                if (INFO_LOG === true) { logger.write("[INFO] recalculateScale -> getMaxRate -> Entering function."); }

                let maxValue = 0;

                for (let i = 0; i < marketFile.length; i++) {

                    let currentMax = marketFile[i][1];   // 1 = rates.

                    if (maxValue < currentMax) {
                        maxValue = currentMax;
                    }
                }

                return maxValue;

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScale -> err = " + err); }

        }
    }

    function plotChart() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] plotChart -> Entering function."); }

            if (stairsArray.length > 0) {

                for (var i = 0; i < stairsArray.length; i++) {

                    stairs = stairsArray[i];

                    let stairsPoint1;
                    let stairsPoint2;
                    let stairsPoint3;
                    let stairsPoint4;

                    if (stairs.direction === 'up') {

                        stairsPoint1 = {
                            x: stairs.begin + timePeriod / 7 * 5.5,
                            y: stairs.firstMin
                        };

                        stairsPoint2 = {
                            x: stairs.end - timePeriod / 7 * 1.5,
                            y: stairs.lastMin
                        };

                        stairsPoint3 = {
                            x: stairs.end - timePeriod / 7 * 5.5,
                            y: stairs.lastMax
                        };

                        stairsPoint4 = {
                            x: stairs.begin + timePeriod / 7 * 1.5,
                            y: stairs.firstMax
                        };

                    } else {

                        stairsPoint1 = {
                            x: stairs.begin + timePeriod / 7 * 1.5,
                            y: stairs.firstMin
                        };

                        stairsPoint2 = {
                            x: stairs.end - timePeriod / 7 * 5.5,
                            y: stairs.lastMin
                        };

                        stairsPoint3 = {
                            x: stairs.end - timePeriod / 7 * 1.5,
                            y: stairs.lastMax
                        };

                        stairsPoint4 = {
                            x: stairs.begin + timePeriod / 7 * 5.5,
                            y: stairs.firstMax
                        };
                    }

                    stairsPoint1 = timeLineCoordinateSystem.transformThisPoint(stairsPoint1);
                    stairsPoint2 = timeLineCoordinateSystem.transformThisPoint(stairsPoint2);
                    stairsPoint3 = timeLineCoordinateSystem.transformThisPoint(stairsPoint3);
                    stairsPoint4 = timeLineCoordinateSystem.transformThisPoint(stairsPoint4);

                    stairsPoint1 = transformThisPoint(stairsPoint1, thisObject.container);
                    stairsPoint2 = transformThisPoint(stairsPoint2, thisObject.container);
                    stairsPoint3 = transformThisPoint(stairsPoint3, thisObject.container);
                    stairsPoint4 = transformThisPoint(stairsPoint4, thisObject.container);

                    if (stairsPoint2.x < viewPort.visibleArea.bottomLeft.x || stairsPoint1.x > viewPort.visibleArea.bottomRight.x) {
                        continue;
                    }

                    stairsPoint1 = viewPort.fitIntoVisibleArea(stairsPoint1);
                    stairsPoint2 = viewPort.fitIntoVisibleArea(stairsPoint2);
                    stairsPoint3 = viewPort.fitIntoVisibleArea(stairsPoint3);
                    stairsPoint4 = viewPort.fitIntoVisibleArea(stairsPoint4);

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(stairsPoint1.x, stairsPoint1.y);
                    browserCanvasContext.lineTo(stairsPoint2.x, stairsPoint2.y);
                    browserCanvasContext.lineTo(stairsPoint3.x, stairsPoint3.y);
                    browserCanvasContext.lineTo(stairsPoint4.x, stairsPoint4.y);

                    browserCanvasContext.closePath();

                    let opacity = '0.25';

                    if (stairs.direction === 'up') { browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.PATINATED_TURQUOISE + ', ' + opacity + ')'; }
                    if (stairs.direction === 'down') { browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.RED + ', ' + opacity + ')'; }

                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= stairs.begin && dateValue <= stairs.end) {


                            /* highlight the current stairs */

                            browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', 0.1)'; // Current stairs accroding to time

                        } else {

                            if (stairs.direction === 'up') { browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GREEN + ', ' + opacity + ')'; }
                            if (stairs.direction === 'down') { browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.RUSTED_RED + ', ' + opacity + ')'; }
                        }

                    } else {

                        if (stairs.direction === 'up') { browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GREEN + ', ' + opacity + ')'; }
                        if (stairs.direction === 'down') { browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.RUSTED_RED + ', ' + opacity + ')'; }
                    }

                    browserCanvasContext.fill();

                    browserCanvasContext.lineWidth = 1;
                    browserCanvasContext.stroke();
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] plotChart -> err = " + err); }

        }
    }

    function onZoomChanged(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onZoomChanged -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onZoomChanged -> err = " + err); }

        }
    }

    function onDragFinished() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDragFinished -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDragFinished -> err = " + err); }

        }
    }

    function onOffsetChanged() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onOffsetChanged -> Entering function."); }

            if (Math.random() * 100 > 95) {

                recalculate()
            };

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onOffsetChanged -> err = " + err); }

        }
    }
}

