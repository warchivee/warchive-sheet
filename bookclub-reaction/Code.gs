function doGet(e) {
    const op = e.parameter.req;

    const ss = SpreadsheetApp.open(DriveApp.getFileById("Sheet_ID"));
    const sn = "reaction";
    const sn_c = "reactionCount";

    if (op == "get")
        return findAll(e, ss, sn, sn_c);

    if (op == "put")
        return update(e, ss, sn, sn_c);
}

function _getSheetData(ss, sn) {
    const rowNum = 2;
    const colNum = 1;
    const sh = ss.getSheetByName(sn);

    if(sh.getLastRow() == 1) {
      return;
    } else {
      return sh.getRange(rowNum, colNum, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    }
}

function _mappingCountData(sh) {
    if (!sh) {
      return [];
    }

    return sh.map((data, index) => {
      return {
        rowIndex: index + 1,
        book_id: data[0],
        report_id: data[1],
        is_best: data[2],
        is_funny: data[3],
        is_interested: data[4],
        is_empathized: data[5],
        is_amazed: data[6],
      }
    });
}

function _mappingReactionData(sh) {
    if (!sh) {
     return [];
    }

    return sh.map((data, index) => {
      return {
        number: index + 1,
        book_id: data[0],
        report_id: data[1],
        uuid: data[2],
        is_best: data[3],
        is_funny: data[4],
        is_interested: data[5],
        is_empathized: data[6],
        is_amazed: data[7],
      }
    });
}

function findAllByUUID(e, ss, sn) {
  var uuid = e.parameter.uid;
  var sh = _getSheetData(ss, sn);
  var result = [];

  if (sh) {
    for (var i = 0; i < sh.length; i++) {
      var row = sh[i];
      if (row[2] == uuid) {
        result.push(row);
      }
    }
  }
  return _mappingReactionData(result);
}

function findReactionCountData(ss, sn) {
  var sh = _getSheetData(ss, sn);
  return _mappingCountData(sh);
}

function findAll(e, ss, sn, sn_c) {
    var reactionData = findAllByUUID(e, ss, sn);
    var reactionCountData = findReactionCountData(ss, sn_c);

    var result = {
      reactionCount: reactionCountData,
      reaction: reactionData,
    };

    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON)
}

function findOne(book_id, report_id, uuid, ss, sn) {
    var sh = ss.getSheetByName(sn);
    var data = sh.getDataRange().getValues();
    var rowIndex = -1;

    for(var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] == book_id && row[1] == report_id && row[2] === uuid) {
        rowIndex = i + 1;
        break;
      }
    }
    return rowIndex;
}

function updateReactionCount(ss, sn, book_id, report_id) {
    var sh = ss.getSheetByName(sn);

    if(book_id && report_id) {
      var data = sh.getDataRange().getValues();
      var exists = data.some(function(row) {
      return row[0] == book_id && row[1] == report_id;
    });

      if (!exists) {
        var newRowIndex = sh.getLastRow() + 1;
        var newRow = [book_id, report_id];

        // D, E, F, G, H 열의 수식을 작성하여 reactionCount의 C, D, E, F, G 열에 추가
        for (var i = 0; i < 5; i++) { // 5개의 열을 처리 (D=4, E=5, F=6, G=7, H=8)
          var columnLetter = String.fromCharCode('D'.charCodeAt(0) + i);
          var formula = `=COUNTIFS(reaction!$A:$A, $A${newRowIndex}, reaction!$B:$B, $B${newRowIndex}, reaction!${columnLetter}:${columnLetter}, TRUE)`;
          newRow.push(formula);
        }
        // 새로운 행을 추가
        sh.appendRow(newRow);
      }
    }
}

function update(e, ss, sn, sn_c) {
    const book_id = e.parameter.bid;
    const report_id = e.parameter.rid;
    const uuid = e.parameter.uid.toLowerCase();
    const emoji = e.parameter.emj;
    var resultText = "";

    function isValidUUID(uuid) {
      var uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
      return uuidRegex.test(uuid);
    }

    if(!uuid || !isValidUUID(uuid)) {
      return ContentService.createTextOutput(JSON.stringify('Error: Invalid UUID parameter')).setMimeType(ContentService.MimeType.JSON);
    }

    function stringToArrayOfNumbers(str) {
      return str.split(',').map(char => char.trim().toLowerCase() === 'true');
    }

    function getEmojiColIndex() {
      return 4;
    }

    function getEmojiLength() {
      return 5;
    }

    function getUpdatedAtIndex() {
      return 10;
    }

    try {
      var emojiBooleanArray = stringToArrayOfNumbers(emoji);
      if(emojiBooleanArray.length !== 5) {
        throw new Error('emoji 길이가 5가 아닙니다.');
      }        
      var sh = ss.getSheetByName(sn);
      var rowIndex = findOne(book_id, report_id, uuid, ss, sn);
      var currentTime = new Date().toLocaleString();

      if (rowIndex === -1) {
        // create
        var newRowRawData = [book_id, report_id, uuid, emojiBooleanArray, currentTime, currentTime];

        // Boolean 배열의 각 요소를 분해하여 새 배열로 생성
        var newRowData = [];
        for (var i = 0; i < newRowRawData.length; i++) {
          if (Array.isArray(newRowRawData[i])) {
            newRowData = newRowData.concat(newRowRawData[i]);
          } else {
            newRowData.push(newRowRawData[i]);
          }
        }
        sh.appendRow(newRowData);
        resultText = "created successfully";
        updateReactionCount(ss, sn_c, book_id, report_id)
      } else {
        // update
        sh.getRange(rowIndex, getEmojiColIndex(), 1, getEmojiLength()).setValues([emojiBooleanArray]);
        sh.getRange(rowIndex, getUpdatedAtIndex()).setValue(currentTime);
        resultText = "updated successfully";
      }
    } catch (error) {
      console.error("Error occurred during direct assignment:", error);
      // Handle the error as needed
    }

    result = {
      result: resultText
    };

    return ContentService.createTextOutput(JSON.stringify({ data: result })).setMimeType(ContentService.MimeType.JSON)
}