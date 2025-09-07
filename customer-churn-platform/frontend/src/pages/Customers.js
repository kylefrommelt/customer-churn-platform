import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Box,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { apiService } from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCustomers();
      setCustomers(response.data.customers || []);
      setError(null);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Customers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: 'customer_code',
      headerName: 'Customer ID',
      width: 120,
    },
    {
      field: 'signup_date',
      headerName: 'Signup Date',
      width: 120,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      },
    },
    {
      field: 'age',
      headerName: 'Age',
      width: 80,
      type: 'number',
    },
    {
      field: 'gender',
      headerName: 'Gender',
      width: 80,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 120,
    },
    {
      field: 'subscription_type',
      headerName: 'Subscription',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'Enterprise'
              ? 'primary'
              : params.value === 'Premium'
              ? 'secondary'
              : 'default'
          }
          size="small"
        />
      ),
    },
    {
      field: 'monthly_charges',
      headerName: 'Monthly Charges',
      width: 130,
      type: 'number',
      valueFormatter: (params) => `$${params.value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'total_charges',
      headerName: 'Total Charges',
      width: 130,
      type: 'number',
      valueFormatter: (params) => `$${params.value?.toFixed(2) || '0.00'}`,
    },
    {
      field: 'contract_length',
      headerName: 'Contract',
      width: 100,
    },
    {
      field: 'payment_method',
      headerName: 'Payment Method',
      width: 130,
    },
    {
      field: 'churned',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Churned' : 'Active'}
          color={params.value ? 'error' : 'success'}
          size="small"
        />
      ),
    },
    {
      field: 'churn_date',
      headerName: 'Churn Date',
      width: 120,
      valueFormatter: (params) => {
        if (params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return '';
      },
    },
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Customer Management
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" color="textSecondary">
          Total customers: {customers.length}
        </Typography>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={customers}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection
          disableSelectionOnClick
          getRowId={(row) => row.customer_id}
          sx={{
            '& .MuiDataGrid-cell:hover': {
              color: 'primary.main',
            },
          }}
        />
      </Paper>
    </Container>
  );
};

export default Customers;
