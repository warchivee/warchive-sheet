function doGet(e) {
    const op = e.parameter.req;
    const ss = SpreadsheetApp.open(DriveApp.getFileById("Sheet_ID"));

    const sn = "ranking";
    const sn_w = "winning";

    if (op == "get")
        return findAll(ss, sn);

    if (op == "put")
        return create(e, ss, sn_w);
}

function findAll(ss, sn) {
    function _getRankingTotalRows() {
      return 3;
    }

    function _getRankingTotalColumns() {
      return 64;
    }

    function _getSheetData(ss, sn, lastRow, lastCol) {
      const rowNum = 1;
      const colNum = 2;
      var sh = ss.getSheetByName(sn);
      if(sh.getLastRow() == 1) {
        return;
      }
      return sh.getRange(rowNum, colNum, lastRow, lastCol).getValues();
    }

    function transpose(matrix) {
      return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }

    function _mappingRanking(sh) {
      if (!sh) {
        return [];
      }
        return sh.map((data) => {
          return {
            character_id: data[0],
            championship_rate: Number(data[1].toFixed(2)),
            winning_rate: Number(data[2].toFixed(2)),
          }
        });
    }

    var sh = _getSheetData(ss, sn, _getRankingTotalRows(), _getRankingTotalColumns());
    var transposedData = transpose(sh);
    var result = _mappingRanking(transposedData);

    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON)
}

function create(e, ss, sn) {
    var arr = [[], e.parameter.w1, e.parameter.w2, e.parameter.w3, e.parameter.w4, e.parameter.w5, e.parameter.w6];

    function stringToArrayOfNumbers(str) {
      return str.split(',').map(function(num) {
        return parseInt(num, 10);
      });
    }

    // Loop through arr starting from index 1 (since index 0 is an empty array)
    for (var i = 1; i < arr.length; i++) {
      if (typeof arr[i] === 'string') {
        arr[i] = stringToArrayOfNumbers(arr[i]);
      }
    }

    // Flatten arr[1] to arr[6] into a single array
    var includedNumbers = arr.slice(1).flat();

    // Determine the range of numbers (assuming 1 to 64)
    var allNumbers = Array.from({ length: 64 }, (_, index) => index + 1);

    // Filter out the included numbers to find the non-included numbers
    var nonIncludedNumbers = allNumbers.filter(num => !includedNumbers.includes(num));

    // Add non-included numbers to arr[0]
    arr[0] = nonIncludedNumbers;

    var newRow = Array(64);

    // Populate columnArray based on arr[1] to arr[6]
    for (var col = 0; col <= 6; col++) {
      var columnData = arr[col];
      if (columnData) {
        columnData.forEach(function(num) {
            if (!newRow[num - 1]) {
              newRow[num - 1] = col;
            }
        });
      }
    }

    try {
      var sh = ss.getSheetByName(sn);
      sh.appendRow(newRow);
      } catch (error) {
      console.error("Error occurred during direct assignment:", error);
      // Handle the error as needed
    }

    return ContentService.createTextOutput(JSON.stringify({ data: "success" })).setMimeType(ContentService.MimeType.JSON)
}