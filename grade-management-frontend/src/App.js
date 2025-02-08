import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:3002';

const Input = styled('input')({
  display: 'none',
});

function App() {
  const [file, setFile] = useState(null);
  const [registerNumber, setRegisterNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studentData, setStudentData] = useState(null);

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`${BACKEND_URL}/upload`, formData);
      setSuccess('File uploaded successfully!');
      console.log(response.data);
    } catch (err) {
      setError('Error uploading file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!registerNumber) {
      setError('Please enter a register number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${BACKEND_URL}/getStudentDetails/${registerNumber}`);
      setStudentData(response.data);
    } catch (err) {
      setError('Error finding student: ' + err.message);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const viewPDF = () => {
    window.open(`${BACKEND_URL}/viewPDF`, '_blank');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Student Grade Management
        </Typography>

        {/* File Upload Section */}
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <label htmlFor="contained-button-file">
            <Input 
              accept=".xlsx,.xls" 
              id="contained-button-file" 
              type="file" 
              onChange={handleFileUpload}
            />
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              sx={{ mr: 2 }}
            >
              Upload Excel
            </Button>
          </label>
          
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={viewPDF}
          >
            View PDF
          </Button>
        </Box>

        {/* Search Section */}
        <Box sx={{ my: 4, display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="Register Number"
            variant="outlined"
            value={registerNumber}
            onChange={(e) => setRegisterNumber(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            sx={{ minWidth: '120px' }}
          >
            Search
          </Button>
        </Box>

        {/* Status Messages */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ my: 2 }}>{success}</Alert>}

        {/* Results Table */}
        {studentData && (
          <TableContainer component={Paper} sx={{ mt: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Register No.</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Grade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(studentData.subjects).map(([subject, grade]) => (
                  <TableRow key={subject}>
                    {subject === '21CS301' && (
                      <>
                        <TableCell rowSpan={6}>{studentData['Register No.']}</TableCell>
                        <TableCell rowSpan={6}>{studentData['Name of the student']}</TableCell>
                      </>
                    )}
                    <TableCell>{subject}</TableCell>
                    <TableCell>{grade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}

export default App; 