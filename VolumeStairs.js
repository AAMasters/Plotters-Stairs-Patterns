function newAAMastersPlottersStairsPatternsVolumeStairs() {

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        container: undefined,
        getContainer: getContainer,
        setTimePeriod: setTimePeriod,
        setDatetime: setDatetime,
        draw: draw
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let plotArea = newTimeLineCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.
    let plotAreaFrame = newTimeLineCoordinateSystem();  // This chart uses this extra object.

    let timePeriod;                     // This will hold the current Time Period the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let fileCache;                      // This object will provide the different Market Files at different Time Periods.
    let fileCursorCache;                // This object will provide the different File Cursors at different Time Periods.

    let scaleFile;                      // This file is used to calculate the scale.

    /* these are module specific variables: */

    let stairsArray = [];                   // Here we keep the stairsArray to be ploted every time the Draw() function is called by the AAWebPlatform.

    return thisObject;

    function initialize(pStorage, pExchange, pMarket, pDatetime, pTimePeriod, callBackFunction) {

        /* Store the information received. */

        fileCache = pStorage.fileCache;
        fileCursorCache = pStorage.fileCursorCache;

        datetime = pDatetime;
        timePeriod = pTimePeriod;

        /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

        scaleFile = fileCache.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

        /* Now we set the right files according to current Period. */

        marketFile = fileCache.getFile(pTimePeriod); 
        fileCursor = fileCursorCache.getFileCursor(pTimePeriod);

        /* Listen to the necesary events. */

        viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);
        canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);

        /* Get ready for plotting. */

        recalculateScaleX();
        recalculate();
        recalculateScaleY();

        callBackFunction();

    }

    function getContainer(point) {

        let container;

        /* First we check if this point is inside this space. */

        if (this.container.frame.isThisPointHere(point) === true) {

            return this.container;

        } else {

            /* This point does not belong to this space. */

            return undefined;
        }

    }

    function setTimePeriod(pTimePeriod) {

        timePeriod = pTimePeriod;

        if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

            let newMarketFile = fileCache.getFile(pTimePeriod);

            if (newMarketFile !== undefined) {

                marketFile = newMarketFile;

                recalculate();

            }

        } else {

            fileCursorCache.setTimePeriod(pTimePeriod);

            fileCursorCache.setDatetime(datetime);

            let newFileCursor = fileCursorCache.getFileCursor(pTimePeriod);

            if (newFileCursor !== undefined) {

                fileCursor = newFileCursor;

                recalculate();

            }
        }

        if (timePeriod === _1_HOUR_IN_MILISECONDS) {

            fileCursorCache.setTimePeriod(pTimePeriod);

            fileCursorCache.setDatetime(datetime);

        }

    }

    function setDatetime(newDatetime) {

        /* If there is a change in the day, then we take some actions, otherwise, we dont. */

        let currentDate = Math.trunc(datetime.valueOf() / ONE_DAY_IN_MILISECONDS);
        let newDate = Math.trunc(newDatetime.valueOf() / ONE_DAY_IN_MILISECONDS);

        datetime = newDatetime;

        if (currentDate !== newDate) {

            if (timePeriod <= _1_HOUR_IN_MILISECONDS) {

                fileCursorCache.setDatetime(newDatetime);

            }
        }
    }

    function draw() {

        this.container.frame.draw();

        if (timePeriod < _1_HOUR_IN_MILISECONDS) {

            if (Math.random() * 1000 > 995) {

                recalculateScaleX();
                recalculate();
                recalculateScaleY();

            }
        }

        plotChart();

    }

    function recalculate() {

        if (timePeriod >= _1_HOUR_IN_MILISECONDS) {

            recalculateUsingMarketFiles();

        } else {

            recalculateUsingDailyFiles();

        }

        thisObject.container.eventHandler.raiseEvent("Volumes Changed", stairsArray);
    }

    function recalculateUsingDailyFiles() {

        if (fileCursor === undefined) { return; } // We need to wait

        if (fileCursor.files.size === 0) { return; } // We need to wait until there are files in the cursor

        let daysOnSides = getSideDays(timePeriod);

        let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, plotArea);
        let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, plotArea);

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

    }

    function recalculateUsingMarketFiles() {

        if (marketFile === undefined) { return; } // Initialization not complete yet.

        let daysOnSides = getSideDays(timePeriod);

        let leftDate = getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, plotArea);
        let rightDate = getDateFromPoint(viewPort.visibleArea.topRight, thisObject.container, plotArea);

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
    }

    function recalculateScaleX() {


        var minValue = {
            x: EARLIEST_DATE.valueOf()
        };

        var maxValue = {
            x: MAX_PLOTABLE_DATE.valueOf()
        };

        plotArea.initializeX(
            minValue,
            maxValue,
            thisObject.container.frame.width
        );

        plotAreaFrame.initializeX(
            minValue,
            maxValue,
            thisObject.container.frame.width
        );

    }

    function recalculateScaleY() {

        var minValue = {
            y: 0
        };

        var maxValue = {
            y: 0
        };

        let timePeriodRatio = ONE_DAY_IN_MILISECONDS / timePeriod;

        maxValue.y = getMaxVolume() / (timePeriodRatio / 10);

        plotArea.initializeY(
            minValue,
            maxValue,
            viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topLeft.y
        );

        plotAreaFrame.initializeY(
            minValue,
            maxValue,
            thisObject.container.frame.height
        );

        function getMaxVolume() {

            let maxValue = 0;

            for (var i = 0; i < scaleFile.length; i++) {

                let currentMax = (scaleFile[i][5] + scaleFile[i][6]) * 8;

                if (maxValue < currentMax) {
                    maxValue = currentMax;
                }
            }

            return maxValue;

        }

    }

    function plotChart() {

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


                        volumeBarPointA1 = plot.inverseTransform(volumeBarPointA1, height);
                        volumeBarPointA2 = plot.inverseTransform(volumeBarPointA2, height);
                        volumeBarPointA3 = plot.inverseTransform(volumeBarPointA3, height);
                        volumeBarPointA4 = plot.inverseTransform(volumeBarPointA4, height);

                        volumeBarPointA1 = transformThisPoint(volumeBarPointA1, thisObject.container);
                        volumeBarPointA2 = transformThisPoint(volumeBarPointA2, thisObject.container);
                        volumeBarPointA3 = transformThisPoint(volumeBarPointA3, thisObject.container);
                        volumeBarPointA4 = transformThisPoint(volumeBarPointA4, thisObject.container);


                        if (volumeBarPointA4.x < viewPort.visibleArea.bottomLeft.x || volumeBarPointA1.x > viewPort.visibleArea.bottomRight.x) {
                            return false;
                        }

                        return true;
                    }

                    if (calculateBuys(plotAreaFrame, thisObject.container.frame.height) === false) { continue; } // We try to see if it fits in the visible area.

                    if (volumeBarPointA1.y > viewPort.visibleArea.bottomLeft.y && frameHeightInViewPort > visibleHeight * 2 / 3) {

                        if (calculateBuys(plotArea, visibleHeight) === false) { continue; }  // We snap t to the view port.

                        /* Now we set the real value of y. */

                        volumeBarPointA1.y = viewPort.visibleArea.bottomRight.y;
                        volumeBarPointA2.y = viewPort.visibleArea.bottomRight.y - stairs.firstAmount * 2 * plotArea.scale.y;
                        volumeBarPointA3.y = viewPort.visibleArea.bottomRight.y - stairs.lastAmount * 2 * plotArea.scale.y;
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

                        volumeBarPointB1 = plot.inverseTransform2(volumeBarPointB1, height);
                        volumeBarPointB2 = plot.inverseTransform2(volumeBarPointB2, height);
                        volumeBarPointB3 = plot.inverseTransform2(volumeBarPointB3, height);
                        volumeBarPointB4 = plot.inverseTransform2(volumeBarPointB4, height);

                        volumeBarPointB1 = transformThisPoint(volumeBarPointB1, thisObject.container);
                        volumeBarPointB2 = transformThisPoint(volumeBarPointB2, thisObject.container);
                        volumeBarPointB3 = transformThisPoint(volumeBarPointB3, thisObject.container);
                        volumeBarPointB4 = transformThisPoint(volumeBarPointB4, thisObject.container);

                    }

                    calculateSells(plotAreaFrame, thisObject.container.frame.height); // We try to see if it fits in the visible area.

                    if (volumeBarPointB1.y < viewPort.visibleArea.topLeft.y && frameHeightInViewPort > visibleHeight * 2 / 3) {

                        calculateSells(plotArea, visibleHeight); // We snap it to the view port.

                        /* Now we set the real value of y. */

                        volumeBarPointB1.y = viewPort.visibleArea.topLeft.y;
                        volumeBarPointB2.y = viewPort.visibleArea.topLeft.y + stairs.firstAmount * 2 * plotArea.scale.y;
                        volumeBarPointB3.y = viewPort.visibleArea.topLeft.y + stairs.lastAmount * 2 * plotArea.scale.y;
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


                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= stairs.begin && dateValue <= stairs.end) {

                            browserCanvasContext.fillStyle = 'rgba(255, 233, 31, ' + opacity + ')'; // Current bar accroding to time

                        } else {

                            browserCanvasContext.fillStyle = 'rgba(64, 217, 26, ' + opacity + ')';
                        }

                    } else {

                        browserCanvasContext.fillStyle = 'rgba(64, 217, 26, ' + opacity + ')';

                    }

                    browserCanvasContext.fill();
                    browserCanvasContext.strokeStyle = 'rgba(27, 105, 7, ' + opacity + ')';
                    browserCanvasContext.lineWidth = 1;
                    browserCanvasContext.stroke();

                } else {

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(volumeBarPointB1.x, volumeBarPointB1.y);
                    browserCanvasContext.lineTo(volumeBarPointB2.x, volumeBarPointB2.y);
                    browserCanvasContext.lineTo(volumeBarPointB3.x, volumeBarPointB3.y);
                    browserCanvasContext.lineTo(volumeBarPointB4.x, volumeBarPointB4.y);

                    browserCanvasContext.closePath();

                    if (datetime !== undefined) {

                        let dateValue = datetime.valueOf();

                        if (dateValue >= stairs.begin && dateValue <= stairs.end) {

                            browserCanvasContext.fillStyle = 'rgba(255, 233, 31, ' + opacity + ')'; // Current candle accroding to time

                        } else {

                            browserCanvasContext.fillStyle = 'rgba(219, 18, 18, ' + opacity + ')';
                        }

                    } else {

                        browserCanvasContext.fillStyle = 'rgba(219, 18, 18, ' + opacity + ')';

                    }

                    browserCanvasContext.strokeStyle = 'rgba(130, 9, 9, ' + opacity + ')';

                    browserCanvasContext.fill();
                    browserCanvasContext.lineWidth = 1;
                    browserCanvasContext.stroke();


                }




            }

        }
    }

    function onZoomChanged(event) {

        recalculateScaleX();
        recalculate();
        recalculateScaleY();

    }

    function onDragFinished() {

        recalculateScaleX();
        recalculate();
        recalculateScaleY();

    }
}

