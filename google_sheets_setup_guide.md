# Google Sheets Backend Setup Guide

This guide walks you through setting up your Google Sheet [Mahira Health Care Spreadsheet](https://docs.google.com/spreadsheets/d/1ZbiGGL-q-AdyBvyGsw3sc8QtAKZCUlcSm8aZgV9SgRg/edit?usp=sharing) as a free, synchronized cloud backend database.

---

## Step 1: Open the Apps Script Editor

1. Open your Google Sheet in your web browser:
   **[Mahira Health Care Sheet](https://docs.google.com/spreadsheets/d/1ZbiGGL-q-AdyBvyGsw3sc8QtAKZCUlcSm8aZgV9SgRg/edit?usp=sharing)**
2. In the top menu bar, click on **Extensions** -> **Apps Script**.
3. A new browser tab will open displaying the Google Apps Script editor.

---

## Step 2: Paste the Sync Code

1. In the script editor, delete any default code that is already there.
2. Copy the corrected script code below and paste it into the editor window:

```javascript
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var medicineSheet = ss.getSheetByName("Medicines") || ss.insertSheet("Medicines");
  
  // Set up header columns if sheet is completely empty
  if (medicineSheet.getLastRow() === 0) {
    medicineSheet.appendRow(["Name", "Form", "Strength", "DosePerKg", "Unit", "MaxDose"]);
  }
  
  // Populate default system medicines if sheet has only headers
  if (medicineSheet.getLastRow() === 1) {
    var defaults = [
      ["Amoxicillin", "Syrup", "125mg/5ml", 25, "mg", 500],
      ["Paracetamol", "Suspension", "120mg/5ml", 15, "mg", 500],
      ["Ibuprofen", "Suspension", "100mg/5ml", 10, "mg", 400],
      ["Cetirizine", "Syrup", "5mg/5ml", 0.25, "mg", 10],
      ["Azithromycin", "Suspension", "200mg/5ml", 10, "mg", 500],
      ["Salbutamol", "Syrup", "2mg/5ml", 0.1, "mg", 4],
      ["Zinc Sulfate", "Dispersible Tablet", "20mg", "", "tab", ""],
      ["Domperidone", "Suspension", "1mg/ml", 0.25, "mg", 10],
      ["Ondansetron", "Syrup", "2mg/5ml", 0.1, "mg", 4],
      ["Montelukast", "Chewable Tablet", "4mg", "", "tab", ""],
      ["Ofloxacin", "Suspension", "50mg/5ml", 7.5, "mg", 200],
      ["Vitamin D3", "Drops", "400IU/drop", "", "drops", ""]
    ];
    defaults.forEach(function(row) {
      medicineSheet.appendRow(row);
    });
  }
  
  var rows = medicineSheet.getDataRange().getValues();
  var medicines = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0] || rows[i][0].toString().trim() === "") continue;
    medicines.push({
      name: rows[i][0].toString().trim(),
      form: rows[i][1].toString().trim(),
      strength: rows[i][2].toString().trim(),
      dosePerKg: rows[i][3] === "" || rows[i][3] === null ? null : parseFloat(rows[i][3]),
      unit: rows[i][4].toString().trim(),
      maxDose: rows[i][5] === "" || rows[i][5] === null ? null : parseFloat(rows[i][5])
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(medicines))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var action = data.action || "log_prescription";
  
  if (action === "log_prescription") {
    var prescriptionSheet = ss.getSheetByName("Prescriptions") || ss.insertSheet("Prescriptions");
    if (prescriptionSheet.getLastRow() === 0) {
      prescriptionSheet.appendRow([
        "Timestamp", "Rx Number", "Date", "Patient Name", 
        "Age", "Weight (kg)", "Doctor", "Medicines", "Advice", "Follow-up"
      ]);
    }
    
    var medsString = data.selectedMedicines.map(function(m, idx) {
      return (idx + 1) + ". " + m.name + " (" + m.form + " " + m.strength + ") - " + m.frequency + " for " + m.duration;
    }).join("\n");
    
    prescriptionSheet.appendRow([
      new Date(),
      data.rxNumber,
      data.date,
      data.patientName,
      data.patientAge,
      data.patientWeight || "—",
      data.doctorName || "—",
      medsString,
      data.advice || "—",
      data.followUp || "—"
    ]);
  } 
  else if (action === "add_medicine") {
    var medicineSheet = ss.getSheetByName("Medicines") || ss.insertSheet("Medicines");
    
    // Ensure headers exist
    if (medicineSheet.getLastRow() === 0) {
      medicineSheet.appendRow(["Name", "Form", "Strength", "DosePerKg", "Unit", "MaxDose"]);
    }
    
    // Auto-populate defaults if sheet only had headers (avoids empty sheets getting stuck)
    if (medicineSheet.getLastRow() === 1) {
      var defaults = [
        ["Amoxicillin", "Syrup", "125mg/5ml", 25, "mg", 500],
        ["Paracetamol", "Suspension", "120mg/5ml", 15, "mg", 500],
        ["Ibuprofen", "Suspension", "100mg/5ml", 10, "mg", 400],
        ["Cetirizine", "Syrup", "5mg/5ml", 0.25, "mg", 10],
        ["Azithromycin", "Suspension", "200mg/5ml", 10, "mg", 500],
        ["Salbutamol", "Syrup", "2mg/5ml", 0.1, "mg", 4],
        ["Zinc Sulfate", "Dispersible Tablet", "20mg", "", "tab", ""],
        ["Domperidone", "Suspension", "1mg/ml", 0.25, "mg", 10],
        ["Ondansetron", "Syrup", "2mg/5ml", 0.1, "mg", 4],
        ["Montelukast", "Chewable Tablet", "4mg", "", "tab", ""],
        ["Ofloxacin", "Suspension", "50mg/5ml", 7.5, "mg", 200],
        ["Vitamin D3", "Drops", "400IU/drop", "", "drops", ""]
      ];
      defaults.forEach(function(row) {
        medicineSheet.appendRow(row);
      });
    }
    
    medicineSheet.appendRow([
      data.medicine.name,
      data.medicine.form,
      data.medicine.strength,
      data.medicine.dosePerKg === null ? "" : data.medicine.dosePerKg,
      data.medicine.unit,
      data.medicine.maxDose === null ? "" : data.medicine.maxDose
    ]);
  }
  else if (action === "delete_medicine") {
    var medicineSheet = ss.getSheetByName("Medicines") || ss.insertSheet("Medicines");
    var rows = medicineSheet.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0].toString().toLowerCase() === data.medicineName.toLowerCase() &&
          rows[i][1].toString().toLowerCase() === data.medicineForm.toLowerCase() &&
          rows[i][2].toString().toLowerCase() === data.medicineStrength.toLowerCase()) {
        medicineSheet.deleteRow(i + 1);
      }
    }
  }
  else if (action === "restore_defaults") {
    var medicineSheet = ss.getSheetByName("Medicines") || ss.insertSheet("Medicines");
    
    // Ensure headers exist
    if (medicineSheet.getLastRow() === 0) {
      medicineSheet.appendRow(["Name", "Form", "Strength", "DosePerKg", "Unit", "MaxDose"]);
    }
    
    var rows = medicineSheet.getDataRange().getValues();
    var existingKeys = {};
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      var key = rows[i][0].toString().toLowerCase().trim() + "|" + 
                rows[i][1].toString().toLowerCase().trim() + "|" + 
                rows[i][2].toString().toLowerCase().trim();
      existingKeys[key] = true;
    }
    
    var defaults = [
      ["Amoxicillin", "Syrup", "125mg/5ml", 25, "mg", 500],
      ["Paracetamol", "Suspension", "120mg/5ml", 15, "mg", 500],
      ["Ibuprofen", "Suspension", "100mg/5ml", 10, "mg", 400],
      ["Cetirizine", "Syrup", "5mg/5ml", 0.25, "mg", 10],
      ["Azithromycin", "Suspension", "200mg/5ml", 10, "mg", 500],
      ["Salbutamol", "Syrup", "2mg/5ml", 0.1, "mg", 4],
      ["Zinc Sulfate", "Dispersible Tablet", "20mg", "", "tab", ""],
      ["Domperidone", "Suspension", "1mg/ml", 0.25, "mg", 10],
      ["Ondansetron", "Syrup", "2mg/5ml", 0.1, "mg", 4],
      ["Montelukast", "Chewable Tablet", "4mg", "", "tab", ""],
      ["Ofloxacin", "Suspension", "50mg/5ml", 7.5, "mg", 200],
      ["Vitamin D3", "Drops", "400IU/drop", "", "drops", ""]
    ];
    
    var addedCount = 0;
    defaults.forEach(function(row) {
      var key = row[0].toLowerCase().trim() + "|" + row[1].toLowerCase().trim() + "|" + row[2].toLowerCase().trim();
      if (!existingKeys[key]) {
        medicineSheet.appendRow(row);
        addedCount++;
      }
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ "status": "success", "action": action }))
                       .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Step 3: Save and Deploy as a Web App

1. Click the **Save** (floppy disk) icon at the top of the Apps Script code window.
2. Click the blue **Deploy** button (top-right corner) and choose **Manage deployments**.
3. In the popup:
   - Click the **Pencil icon** (Edit) next to the active deployment.
   - Under *Version*, select **New version** (this is critical so that Google compiles your corrected code).
   - Under **Execute as**, ensure it says: **Me (your-email@gmail.com)**.
   - Under **Who has access**, ensure it says: **Anyone**.
4. Click **Deploy**.
5. Copy the generated Web App URL.

---

## Step 4: Link it to your Website

### Method A: Use the Settings Panel (Quick Test)
1. Open the running clinic app in your browser: [http://localhost:5173/](http://localhost:5173/)
2. Click the **Settings Gear** icon in the top-right navbar.
3. Paste the URL into the **Google Apps Script Web App URL** input field.
4. Click **Test & Save URL**. A green "Synced" indicator will light up!
5. In the **Manage Medicine Catalog** tab, if you are missing the default system medicines, click **Restore Missing Defaults** to automatically merge the 12 system medicines back into your Sheet catalog!
