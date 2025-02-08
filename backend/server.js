const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const PDFDocument = require('pdfkit-table');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

const uploadDir = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Function to get student grades from Excel
async function getStudentGradesFromExcel(excelFilePath, registerNumber) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.worksheets[0];

        const getCellValue = (cell) => {
            if (!cell || !cell.value) return '';
            if (cell.value.richText) {
                return cell.value.richText.map(rt => rt.text).join('');
            }
            if (cell.value.text) {
                return cell.value.text;
            }
            if (typeof cell.value === 'object') {
                return cell.value.result || '';
            }
            return cell.value.toString().trim();
        };

        let studentData = null;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const currentRegisterNumber = getCellValue(row.getCell(1));
            
            if (currentRegisterNumber === registerNumber.trim()) {
                studentData = {
                    "Register No.": currentRegisterNumber,
                    "Name of the student": getCellValue(row.getCell(2)),
                    subjects: {
                        "21CS301": getCellValue(row.getCell(3)),
                        "21CS302": getCellValue(row.getCell(4)),
                        "21CS303": getCellValue(row.getCell(5)),
                        "21CS304": getCellValue(row.getCell(6)),
                        "21PCS02": getCellValue(row.getCell(7)),
                        "21PCS12": getCellValue(row.getCell(8))
                    }
                };
            }
        });

        return studentData;
    } catch (error) {
        console.error("Error reading Excel file:", error);
        throw new Error("Failed to read Excel file: " + error.message);
    }
}

// Route to upload Excel file
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        const pdfPath = path.join(uploadDir, 'converted.pdf');
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const getCellValue = (cell) => {
            if (!cell || !cell.value) return '';
            if (cell.value.richText) {
                return cell.value.richText.map(rt => rt.text).join('');
            }
            if (cell.value.text) {
                return cell.value.text;
            }
            if (typeof cell.value === 'object') {
                return cell.value.result || '';
            }
            return cell.value.toString().trim();
        };

        const headers = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers.push(getCellValue(cell));
        });

        const tableData = {
            headers: headers,
            rows: []
        };

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const rowData = [];
            
            for (let colNumber = 1; colNumber <= headers.length; colNumber++) {
                const cell = row.getCell(colNumber);
                rowData.push(getCellValue(cell));
            }
            
            if (rowData.some(cell => cell !== '')) {
                tableData.rows.push(rowData);
            }
        }

        doc.fontSize(16).text('Student Grade Sheet', { align: 'center' });
        doc.moveDown();

        await doc.table(tableData, {
            prepareHeader: () => doc.fontSize(10),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.fontSize(10);
                return row;
            },
            width: 750
        });

        doc.end();

        writeStream.on('finish', () => {
            res.json({
                message: "File uploaded and converted successfully",
                pdfPath: pdfPath
            });
        });

    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "Failed to process file: " + error.message });
    }
});

// Route to get student details
app.get("/getStudentDetails/:registerNumber", async (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        const excelFiles = files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
        
        if (excelFiles.length === 0) {
            return res.status(404).json({ error: "No Excel file found" });
        }

        const latestFile = excelFiles[excelFiles.length - 1];
        const excelFilePath = path.join(uploadDir, latestFile);
        
        const studentData = await getStudentGradesFromExcel(excelFilePath, req.params.registerNumber);
        
        if (!studentData) {
            return res.status(404).json({ error: "Student not found" });
        }

        res.json(studentData);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Route to view PDF
app.get("/viewPDF", (req, res) => {
    const pdfPath = path.join(uploadDir, 'converted.pdf');
    
    if (fs.existsSync(pdfPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        fs.createReadStream(pdfPath).pipe(res);
    } else {
        res.status(404).json({ error: "PDF not found. Please upload an Excel file first." });
    }
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
