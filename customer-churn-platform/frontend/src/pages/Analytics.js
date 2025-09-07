import React from 'react';
import { Container, Typography, Paper, Grid, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Analytics = () => {
  // Sample data for demonstration
  const churnTrendData = [
    { month: 'Jan', churnRate: 5.2, newCustomers: 120, lostCustomers: 15 },
    { month: 'Feb', churnRate: 4.8, newCustomers: 135, lostCustomers: 18 },
    { month: 'Mar', churnRate: 6.1, newCustomers: 110, lostCustomers: 22 },
    { month: 'Apr', churnRate: 5.5, newCustomers: 125, lostCustomers: 19 },
    { month: 'May', churnRate: 4.9, newCustomers: 140, lostCustomers: 16 },
    { month: 'Jun', churnRate: 5.3, newCustomers: 130, lostCustomers: 20 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000, predictedRevenue: 47000 },
    { month: 'Feb', revenue: 48000, predictedRevenue: 49500 },
    { month: 'Mar', revenue: 44000, predictedRevenue: 46000 },
    { month: 'Apr', revenue: 51000, predictedRevenue: 52000 },
    { month: 'May', revenue: 53000, predictedRevenue: 54500 },
    { month: 'Jun', revenue: 49000, predictedRevenue: 51000 },
  ];

  const customerSegmentData = [
    { segment: 'High Value', customers: 45, avgCLV: 1250, churnRate: 2.1 },
    { segment: 'Medium Value', customers: 120, avgCLV: 750, churnRate: 4.8 },
    { segment: 'Low Value', customers: 85, avgCLV: 320, churnRate: 8.2 },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Churn Trend Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Churn Rate Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={churnTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="churnRate" 
                  stroke="#ff7300" 
                  strokeWidth={3}
                  name="Churn Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Customer Acquisition vs Churn */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Acquisition vs Churn
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={churnTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="newCustomers" 
                  stackId="1" 
                  stroke="#00C49F" 
                  fill="#00C49F" 
                  name="New Customers"
                />
                <Area 
                  type="monotone" 
                  dataKey="lostCustomers" 
                  stackId="2" 
                  stroke="#FF8042" 
                  fill="#FF8042" 
                  name="Lost Customers"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Revenue Prediction */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Revenue vs Predicted Revenue
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="Actual Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="predictedRevenue" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Customer Segment Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Segment Analysis
            </Typography>
            <Grid container spacing={2}>
              {customerSegmentData.map((segment, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h6" color="primary" gutterBottom>
                      {segment.segment}
                    </Typography>
                    <Typography variant="h4" gutterBottom>
                      {segment.customers}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Customers
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body1">
                        Avg CLV: <strong>${segment.avgCLV}</strong>
                      </Typography>
                      <Typography variant="body1">
                        Churn Rate: <strong>{segment.churnRate}%</strong>
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Key Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Key Insights & Recommendations
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" paragraph>
                📈 <strong>Churn Trend:</strong> Churn rate has been fluctuating between 4.8% and 6.1% over the past 6 months, with a slight improvement in May.
              </Typography>
              <Typography variant="body1" paragraph>
                💰 <strong>Revenue Impact:</strong> High-value customers show the lowest churn rate (2.1%) but represent the highest revenue risk if lost.
              </Typography>
              <Typography variant="body1" paragraph>
                🎯 <strong>Recommendation:</strong> Focus retention efforts on medium-value customers (4.8% churn rate) as they represent the largest segment with manageable risk.
              </Typography>
              <Typography variant="body1" paragraph>
                📊 <strong>Prediction Accuracy:</strong> Revenue predictions are closely tracking actual performance, indicating reliable forecasting models.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
