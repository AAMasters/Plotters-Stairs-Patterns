function newAAMastersPlottersStairsPatternsVolumeStairs() {

    const MODULE_NAME = "AAMasters Plotters Stairs Patterns Volume Stairs";
    const ERROR_LOG = true;
    const INTENSIVE_LOG = false;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        /* Events declared outside the plotter. */

        onDailyFileLoaded: onDailyFileLoaded, 

        // Main functions and properties.

        container: undefined,
        initialize: initialize,
        finalize: finalize,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        recalculateScale: recalculateScale, 
        draw: draw
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let timeLineCoordinateSystem = newTimeLineCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.
    let timeLineCoordinateSystemFrame = newTimeLineCoordinateSystem();  // This chart uses this extra object.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let marketFiles;                      // This object will provide the different Market Files at different Time Periods.
    let dailyFiles;                // This object will provide the different File Cursors at different Time Periods.

    let scaleFile;                      // This file is used to calculate the scale.

    /* these are module specific variables: */

    let stairsArray = [];                   // Here we keep the stairsArray to be ploted every time the Draw() function is called by the AAWebPlatform.

    let zoomChangedEventSubscriptionId
    let offsetChangedEventSubscriptionId
    let filesUpdatedEventSubscriptionId
    let dragFinishedEventSubscriptionId
    let dimmensionsChangedEventSubscriptionId

    return thisObject;

    function finalize() {
        try {

            /* Stop listening to the necesary events. */

            viewPort.eventHandler.stopListening(zoomChangedEventSubscriptionId);
            viewPort.eventHandler.stopListening(offsetChangedEventSubscriptionId);
            marketFiles.eventHandler.stopListening(filesUpdatedEventSubscriptionId);
            canvas.eventHandler.stopListening(dragFinishedEventSubscriptionId);
            thisObject.container.eventHandler.stopListening(dimmensionsChangedEventSubscriptionId)

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

            /* Store the information received. */

            marketFiles = pStorage.marketFiles[0];
            dailyFiles = pStorage.dailyFiles[0];

            datetime = pDatetime;
            timePeriod = pTimePeriod;

            /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

            scaleFile = marketFiles.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

            /* Now we set the right files according to current Period. */

            marketFile = marketFiles.getFile(pTimePeriod);
            fileCursor = dailyFiles.getFileCursor(pTimePeriod);

            /* Listen to the necesary events. */

            zoomChangedEventSubscriptionId = viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);
            offsetChangedEventSubscriptionId = viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);
            filesUpdatedEventSubscriptionId = marketFiles.eventHandler.listenToEvent("Files Updated", onFilesUpdated);
            dragFinishedEventSubscriptionId = canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);

            /* Get ready for plotting. */

            recalculateScaleX();
            recalculate();
            recalculateScaleY();

            dimmensionsChangedEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('Dimmensions Changed', function () {
                recalculateScaleX();
                recalculate();
                recalculateScaleY();
            })

            callBackFunction();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err.stack); }
            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);

        }
    }

    function recalculateScale() {

        recalculateScaleX();
        recalculate();
        recalculateScaleY();

    }

    function getContainer(point) {

        try {

            let container;

            /* First we check if this point is inside this space. */

            if (this.container.frame.isThisPointHere(point) === true) {

                return this.container;

            } else {

                /* This point does not belong to this space. */

                return undefined;
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] getContainer -> err = " + err.stack); }

        }
    }

    function onFilesUpdated() {

        try {

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

            if (ERROR_LOG === true) { logger.write("[ERROR] setTimePeriod -> err = " + err.stack); }

        }
    }

    function setDatetime(pDatetime) {

        datetime = pDatetime;

    }

    function onDailyFileLoaded(event) {

        try {

            if (event.currentValue === event.totalValue) {

                /* This happens only when all of the files in the cursor have been loaded. */

                recalculateScaleX();
                recalculate();
                recalculateScaleY();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFileLoaded -> err = " + err.stack); }

        }
    }

    function draw() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] draw -> Entering function."); }

            this.container.frame.draw();

            plotChart();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] draw -> err = " + err.stack); }

        }
    }

    function recalculate() {

        try {

            if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

                recalculateUsingMarketFiles();

            } else {

                recalculateUsingDailyFiles();

            }

            thisObject.container.eventHandler.raiseEvent("Volumes Changed", stairsArray);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculate -> err = " + err.stack); }

        }
    }

    function recalculateUsingDailyFiles() {

        try {

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
                            type: undefined,
                            begin: undefined,
                            end: undefined,
                            direction: undefined,
                            barsCount: 0,
                            firstAmount: 0,
                            lastAmount: 0
                        };

                        stairs.type = dailyFile[i][0];

                        stairs.begin = dailyFile[i][1];
                        stairs.end = dailyFile[i][2];

                        stairs.direction = dailyFile[i][3];
                        stairs.barsCount = dailyFile[i][4];
                        stairs.firstAmount = dailyFile[i][5];
                        stairs.lastAmount = dailyFile[i][6];

                        if (stairs.begin >= farLeftDate.valueOf() && stairs.end <= farRightDate.valueOf()) {

                            stairsArray.push(stairs);

                            if (datetime.valueOf() >= stairs.begin && datetime.valueOf() <= stairs.end) {

                                thisObject.container.eventHandler.raiseEvent("Current Candle Changed", thisObject.currentCandle);

                            }
                        }
                    }
                }

                currentDate = new Date(currentDate.valueOf() + ONE_DAY_IN_MILISECONDS);
            }

            /* Lests check if all the visible screen is going to be covered by stairsArray. */

            let lowerEnd = leftDate.valueOf();
            let upperEnd = rightDate.valueOf();

            if (stairsArray.length > 0) {

                if (stairsArray[0].begin > lowerEnd || stairsArray[stairsArray.length - 1].end < upperEnd) {

                    setTimeout(recalculate, 2000);

                    //console.log("File missing while calculating stairsArray, scheduling a recalculation in 2 seconds.");

                }
            }

            //console.log("Olivia > recalculateUsingDailyFiles > total stairsArray generated : " + stairsArray.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingDailyFiles -> err = " + err.stack); }

        }
    }

    function recalculateUsingMarketFiles() {

        try {

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
                    type: undefined,
                    begin: undefined,
                    end: undefined,
                    direction: undefined,
                    barsCount: 0,
                    firstAmount: 0,
                    lastAmount: 0
                };

                stairs.type = marketFile[i][0];

                stairs.begin = marketFile[i][1];
                stairs.end = marketFile[i][2];

                stairs.direction = marketFile[i][3];
                stairs.barsCount = marketFile[i][4];
                stairs.firstAmount = marketFile[i][5];
                stairs.lastAmount = marketFile[i][6];

                if (stairs.begin >= leftDate.valueOf() && stairs.end <= rightDate.valueOf()) {

                    stairsArray.push(stairs);

                    if (datetime.valueOf() >= stairs.begin && datetime.valueOf() <= stairs.end) {

                        thisObject.container.eventHandler.raiseEvent("Current Volume-Stairs Changed", thisObject.currentCandle);

                    }
                }
            }

            //console.log("Olivia > recalculateUsingMarketFiles > total stairsArray generated : " + stairsArray.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingMarketFiles -> err = " + err.stack); }

        }
    }

    function recalculateScaleX() {

        try {

            var minValue = {
                x: MIN_PLOTABLE_DATE.valueOf()
            };

            var maxValue = {
                x: MAX_PLOTABLE_DATE.valueOf()
            };

            timeLineCoordinateSystem.initializeX(
                minValue,
                maxValue,
                thisObject.container.frame.width
            );

            timeLineCoordinateSystemFrame.initializeX(
                minValue,
                maxValue,
                thisObject.container.frame.width
            );

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScaleX -> err = " + err.stack); }

        }
    }

    function recalculateScaleY() {

        try {

            var minValue = {
                y: 0
            };

            var maxValue = {
                y: 0
            };

            let timePeriodRatio = ONE_DAY_IN_MILISECONDS / timePeriod;

            maxValue.y = getMaxVolume() / (timePeriodRatio / 2.5);

            timeLineCoordinateSystem.initializeY(
                minValue,
                maxValue,
                viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topLeft.y
            );

            timeLineCoordinateSystemFrame.initializeY(
                minValue,
                maxValue,
                thisObject.container.frame.height
            );

            function getMaxVolume() {

                try {

                    let maxValue = 0;

                    for (var i = 0; i < scaleFile.length; i++) {

                        let currentMax = (scaleFile[i][5] + scaleFile[i][6]) * 8;

                        if (maxValue < currentMax) {
                            maxValue = currentMax;
                        }
                    }

                    return maxValue;

                } catch (err) {

                    if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScaleY -> getMaxVolume -> err = " + err.stack); }

                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScaleY -> err = " + err.stack); }

        }
    }

    function plotChart() {

        try {

            let userPosition = getUserPosition()
            let userPositionDate = userPosition.point.x

            let opacity = '0.25';

            let visibleHeight = viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topLeft.y;

            let frameCorner1 = {
                x: 0,
                y: 0
            };

            let frameCorner2 = {
                x: thisObject.container.frame.width,
                y: thisObject.container.frame.height
            };

            /* Now the transformations. */

            frameCorner1 = transformThisPoint(frameCorner1, thisObject.container.frame.container);
            frameCorner2 = transformThisPoint(frameCorner2, thisObject.container.frame.container);

            let frameHeightInViewPort = frameCorner2.y - frameCorner1.y;


            if (stairsArray.length > 0) {

                for (var i = 0; i < stairsArray.length; i++) {

                    stairs = stairsArray[i];

                    let volumeBarPointA1;
                    let volumeBarPointA2;
                    let volumeBarPointA3;
                    let volumeBarPointA4;

                    if (stairs.type === 'buy') {

                        function calculateBuys(plot, height) {

                            volumeBarPointA1 = {
                                x: stairs.begin + timePeriod / 2,
                                y: 0
                            };

                            volumeBarPointA2 = {
                                x: stairs.begin + timePeriod / 2,
                                y: stairs.firstAmount * 2
                            };

                            volumeBarPointA3 = {
                                x: stairs.end - timePeriod / 2,
                                y: stairs.lastAmount * 2
                            };

                            volumeBarPointA4 = {
                                x: stairs.end - timePeriod / 2,
                                y: 0
                            };


                            volumeBarPointA1 = plot.transformThisPoint(volumeBarPointA1);
                            volumeBarPointA2 = plot.transformThisPoint(volumeBarPointA2);
                            volumeBarPointA3 = plot.transformThisPoint(volumeBarPointA3);
                            volumeBarPointA4 = plot.transformThisPoint(volumeBarPointA4);

                            volumeBarPointA1 = transformThisPoint(volumeBarPointA1, thisObject.container);
                            volumeBarPointA2 = transformThisPoint(volumeBarPointA2, thisObject.container);
                            volumeBarPointA3 = transformThisPoint(volumeBarPointA3, thisObject.container);
                            volumeBarPointA4 = transformThisPoint(volumeBarPointA4, thisObject.container);

                            if (volumeBarPointA4.x < viewPort.visibleArea.bottomLeft.x || volumeBarPointA1.x > viewPort.visibleArea.bottomRight.x) {
                                return false;
                            }

                            return true;
                        }

                        if (calculateBuys(timeLineCoordinateSystemFrame, thisObject.container.frame.height) === false) { continue; } // We try to see if it fits in the visible area.

                        if (volumeBarPointA1.y > viewPort.visibleArea.bottomLeft.y && frameHeightInViewPort > visibleHeight * 2 / 3) {

                            if (calculateBuys(timeLineCoordinateSystem, visibleHeight) === false) { continue; }  // We snap t to the view port.

                            /* Now we set the real value of y. */

                            volumeBarPointA1.y = viewPort.visibleArea.bottomRight.y;
                            volumeBarPointA2.y = viewPort.visibleArea.bottomRight.y - stairs.firstAmount * 2 * timeLineCoordinateSystem.scale.y;
                            volumeBarPointA3.y = viewPort.visibleArea.bottomRight.y - stairs.lastAmount * 2 * timeLineCoordinateSystem.scale.y;
                            volumeBarPointA4.y = viewPort.visibleArea.bottomRight.y;

                        }
                    }

                    let volumeBarPointB1;
                    let volumeBarPointB2;
                    let volumeBarPointB3;
                    let volumeBarPointB4;

                    if (stairs.type === 'sell') {

                        function calculateSells(plot, height) {

                            volumeBarPointB1 = {
                                x: stairs.begin + timePeriod / 2,
                                y: height
                            };

                            volumeBarPointB2 = {
                                x: stairs.begin + timePeriod / 2,
                                y: height - stairs.firstAmount * 2
                            };

                            volumeBarPointB3 = {
                                x: stairs.end - timePeriod / 2,
                                y: height - stairs.lastAmount * 2
                            };

                            volumeBarPointB4 = {
                                x: stairs.end - timePeriod / 2,
                                y: height
                            };

                            volumeBarPointB1 = plot.transformThisPoint2(volumeBarPointB1);
                            volumeBarPointB2 = plot.transformThisPoint2(volumeBarPointB2);
                            volumeBarPointB3 = plot.transformThisPoint2(volumeBarPointB3);
                            volumeBarPointB4 = plot.transformThisPoint2(volumeBarPointB4);

                            volumeBarPointB1 = transformThisPoint(volumeBarPointB1, thisObject.container);
                            volumeBarPointB2 = transformThisPoint(volumeBarPointB2, thisObject.container);
                            volumeBarPointB3 = transformThisPoint(volumeBarPointB3, thisObject.container);
                            volumeBarPointB4 = transformThisPoint(volumeBarPointB4, thisObject.container);

                        }

                        calculateSells(timeLineCoordinateSystemFrame, thisObject.container.frame.height); // We try to see if it fits in the visible area.

                        if (volumeBarPointB1.y < viewPort.visibleArea.topLeft.y && frameHeightInViewPort > visibleHeight * 2 / 3) {

                            calculateSells(timeLineCoordinateSystem, visibleHeight); // We snap it to the view port.

                            /* Now we set the real value of y. */

                            volumeBarPointB1.y = viewPort.visibleArea.topLeft.y;
                            volumeBarPointB2.y = viewPort.visibleArea.topLeft.y + stairs.firstAmount * 2 * timeLineCoordinateSystem.scale.y;
                            volumeBarPointB3.y = viewPort.visibleArea.topLeft.y + stairs.lastAmount * 2 * timeLineCoordinateSystem.scale.y;
                            volumeBarPointB4.y = viewPort.visibleArea.topLeft.y;

                        }
                    }

                    /* Everything must fit within the visible area */

                    if (stairs.type === 'buy') {

                        volumeBarPointA1 = viewPort.fitIntoVisibleArea(volumeBarPointA1);
                        volumeBarPointA2 = viewPort.fitIntoVisibleArea(volumeBarPointA2);
                        volumeBarPointA3 = viewPort.fitIntoVisibleArea(volumeBarPointA3);
                        volumeBarPointA4 = viewPort.fitIntoVisibleArea(volumeBarPointA4);

                    } else {

                        volumeBarPointB1 = viewPort.fitIntoVisibleArea(volumeBarPointB1);
                        volumeBarPointB2 = viewPort.fitIntoVisibleArea(volumeBarPointB2);
                        volumeBarPointB3 = viewPort.fitIntoVisibleArea(volumeBarPointB3);
                        volumeBarPointB4 = viewPort.fitIntoVisibleArea(volumeBarPointB4);

                    }

                    /* Now the drawing */

                    if (stairs.type === 'buy') {

                        browserCanvasContext.beginPath();

                        browserCanvasContext.moveTo(volumeBarPointA1.x, volumeBarPointA1.y);
                        browserCanvasContext.lineTo(volumeBarPointA2.x, volumeBarPointA2.y);
                        browserCanvasContext.lineTo(volumeBarPointA3.x, volumeBarPointA3.y);
                        browserCanvasContext.lineTo(volumeBarPointA4.x, volumeBarPointA4.y);

                        browserCanvasContext.closePath();

                        browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.GREEN + ', ' + opacity + ')';
 
                        if (userPositionDate >= stairs.begin && userPositionDate <= stairs.end) {
                            browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', ' + opacity + ')'; // Current bar accroding to time
                        }  
 
                        browserCanvasContext.fill();
                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.PATINATED_TURQUOISE + ', ' + opacity + ')';
                        browserCanvasContext.lineWidth = 1;
                        browserCanvasContext.stroke();

                    } else {

                        browserCanvasContext.beginPath();

                        browserCanvasContext.moveTo(volumeBarPointB1.x, volumeBarPointB1.y);
                        browserCanvasContext.lineTo(volumeBarPointB2.x, volumeBarPointB2.y);
                        browserCanvasContext.lineTo(volumeBarPointB3.x, volumeBarPointB3.y);
                        browserCanvasContext.lineTo(volumeBarPointB4.x, volumeBarPointB4.y);

                        browserCanvasContext.closePath();

                        if (userPositionDate >= stairs.begin && userPositionDate <= stairs.end) {
                            browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', ' + opacity + ')'; // Current candle accroding to time
                        }  

                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.RED + ', ' + opacity + ')';

                        browserCanvasContext.fill();
                        browserCanvasContext.lineWidth = 1;
                        browserCanvasContext.stroke();

                    }
                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] plotChart -> err = " + err.stack); }

        }
    }

    function onZoomChanged(event) {

        try {

            recalculateScaleX();
            recalculate();
            recalculateScaleY();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onZoomChanged -> err = " + err.stack); }

        }
    }

    function onDragFinished() {

        try {

            recalculateScaleX();
            recalculate();
            recalculateScaleY();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDragFinished -> err = " + err.stack); }

        }
    }

    function onOffsetChanged() {

        try {

            if (Math.random() * 100 > 95) {

                recalculateScaleX();
                recalculate();
                recalculateScaleY();

            };

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onOffsetChanged -> err = " + err.stack); }

        }
    }
}

