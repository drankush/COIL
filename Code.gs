
/**
 * IR Case Log Data Entry Form for CRUD Operations
 */

// CONSTANTS
const SPREADSHEETID = "Your SpreadSheet ID"; // Replace with your actual spreadsheet ID
const DATARANGE = "Sheet1!A2:P"; // Update range for all columns
const DATASHEET = "Sheet1"; // Update sheet name
const DATASHEETID = 0; // Sheet ID ( 0 for the first sheet)
const LASTCOL = "P"; // Last column of your data range
const IDRANGE = "Sheet1!A2:A"; // Range containing UUIDs
const UUID_COLUMN_INDEX = 0; //0 based index in google sheet
const DRIVE_FOLDER_NAME = "Google_Drive_Folder"; // Set the name of the main folder. Place it in the root directory.



// Display HTML page 
function doGet(request) {
  let html = HtmlService.createTemplateFromFile('Index').evaluate();
  let htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return htmlOutput;
}



// PROCESS SUBMITTED FORM DATA
function processForm(formObject) {
  //Form data to be submitted to google sheet
  // Check if UUID exists for update, otherwise create new
  if (formObject.uuid && checkId(formObject.uuid)) {
    const values = [[
      formObject.uuid,
      formObject.patientId,
      formObject.date,
      formObject.age,
      formObject.gender,
      formObject.symptoms,
      formObject.imagingFindings,
      formObject.labFindings,
      formObject.diagnosis,
      formObject.dsaFindings,
      formObject.technicalOutcome,
      formObject.clinicalOutcome,
      formObject.fuDate1,
      formObject.fuRemarks1,
      formObject.fuDate2,
      formObject.fuRemarks2,
    ]];
    const updateRange = getRangeById(formObject.uuid);
    updateRecord(values, updateRange); //Existing UUID: UPDATE the row

  } else { // New record: APPEND a new row to sheet
    const values = [[
      generateUniqueId(),  // New UUID
      formObject.patientId,
      formObject.date,
      formObject.age,
      formObject.gender,
      formObject.symptoms,
      formObject.imagingFindings,
      formObject.labFindings,
      formObject.diagnosis,
      formObject.dsaFindings,
      formObject.technicalOutcome,
      formObject.clinicalOutcome,
      formObject.fuDate1,
      formObject.fuRemarks1,
      formObject.fuDate2,
      formObject.fuRemarks2,

    ]];
    createRecord(values); 
  }


  return getLastTenRecords();
}



// CREATE RECORD 

function createRecord(values) {
 try {
     // Use the append method directly for automatic row addition
    Sheets.Spreadsheets.Values.append({values: values}, SPREADSHEETID, DATARANGE, {valueInputOption: "RAW"});
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}

// READ RECORD 
function readRecord(range) {
  try {
    let result = Sheets.Spreadsheets.Values.get(SPREADSHEETID, range);
    return result.values;
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}

// UPDATE RECORD 
function updateRecord(values, updateRange) {
  try {
    let valueRange = Sheets.newValueRange();
    valueRange.values = values;
    Sheets.Spreadsheets.Values.update(valueRange, SPREADSHEETID, updateRange, { valueInputOption: "RAW" });
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}


// DELETE RECORD 
function deleteRecord(id) {
  const rowToDelete = getRowIndexById(id); //gets the sheet row number where the uuid is.

  if (rowToDelete !== -1){  // Check if the ID was found

  const deleteRequest = {
    "deleteDimension": {
      "range": {
        "sheetId": DATASHEETID,
        "dimension": "ROWS",
        "startIndex": rowToDelete-1, // subtract 1 as startIndex is 0 based
        "endIndex": rowToDelete // endIndex here represents the next row from startIndex, effectively deleting only one row.

      }
    }
  };

  Sheets.Spreadsheets.batchUpdate({ "requests": [deleteRequest] }, SPREADSHEETID);
 } //if the uuid is found.
  return getLastTenRecords();
}


// RETURN LAST 10 RECORDS 
function getLastTenRecords() {
  let lastRow = readRecord(DATARANGE).length + 1;
  let startRow = lastRow - 9;


  if (startRow < 2) {
    startRow = 2;
  }

  let range = DATASHEET + "!A" + startRow + ":" + LASTCOL + lastRow;
  let lastTenRecords = readRecord(range);
  return lastTenRecords;
}

// GET ALL RECORDS 
function getAllRecords() {
  const allRecords = readRecord(DATARANGE);
  return allRecords;
}


// GET RECORD BY ID 
function getRecordById(uuid) {
  if (!uuid || !checkId(uuid)) {
    return null;
  }
  const range = getRangeById(uuid);

  if (!range) {
    return null;
  }
  const result = readRecord(range);
  return result;
}


function getRowIndexById(uuid) {
  if (!uuid) {
    throw new Error('Invalid UUID');
  }
  const idList = readRecord(IDRANGE); // Read the uuids

if(idList){
  for (var i = 0; i < idList.length; i++) {
    if (uuid == idList[i][0]) {
      return parseInt(i+2); //Returns the actual row index in the sheet.
      return parseInt(i + 2); //returns sheet row number (index + 2 because index is 0-based and the data starts from row 2)
    }
  }
  }
  return -1; //UUID not found.
}


// VALIDATE ID 
function checkId(uuid) {
  const idList = readRecord(IDRANGE).flat();  //Gets all values in a single array
  return idList.includes(uuid);
}


// GET RANGE BY ID (modified to use UUID)
function getRangeById(uuid) {
  if (!uuid) {
    return null;
  }
  const idList = readRecord(IDRANGE);
  const rowIndex = idList.findIndex(item => item[0] === uuid);
  if (rowIndex === -1) {
    return null;
  }

  // Construct the A1 notation for the entire row based on UUID.
  const range = `${DATASHEET}!A${rowIndex + 2}:${LASTCOL}${rowIndex + 2}`;
  return range;
}


// INCLUDE HTML PARTS 
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

// GENERATE UNIQUE ID 
function generateUniqueId() {
  let id = Utilities.getUuid();
  return id;
}

// SEARCH RECORDS 
function searchRecords(formObject) {
  let result = [];
  try {
    if (formObject.searchText) {
      const data = readRecord(DATARANGE);
      const searchText = formObject.searchText.toLowerCase();

      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const cellValue = String(data[i][j]).toLowerCase(); // Ensure cell value is a string
          if (cellValue.includes(searchText)) {
            result.push(data[i]);
            break;
          }
        }
      }
    }
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
  return result;
}

// GOOGLE DRIVE FUNCTIONS

function createPatientFolder(patientId, uuid) {
  const folderName = `${patientId}_${uuid.substring(0, 6)}`;
  try {

    const folderId = getPatientFilesFolderId();
    if(folderId){

        const parentFolder = DriveApp.getFolderById(folderId);
        parentFolder.createFolder(folderName);

    } else {
       console.error("Couldnt obtain Parent Folder ID");
    }


  } catch (error) {
    console.error('Folder creation failed:', error);
  }
}


function getPatientFilesFolderId() {
  try {
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      return folders.next().getId();
    } else {
      const newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
      return newFolder.getId();
    }
  } catch (err) {
    console.error('Get Patient Files Folder ID failed:', err.message);
    return null;
  }
}


function openPatientFolder(patientId, uuid) {
  const folderName = `${patientId}_${uuid.substring(0, 6)}`; // Correct folder name
  try {
    const parentFolder = DriveApp.getFolderById(getPatientFilesFolderId());
    const files = parentFolder.getFoldersByName(folderName);

    if (files.hasNext()) {
      return files.next().getUrl();
    } else {
      const newFolder = parentFolder.createFolder(folderName); // Creates if not found
      return newFolder.getUrl();
    }
  } catch (error) {
    console.error('Open folder failed:', error);
    return null; // Handle the error appropriately
  }
}
