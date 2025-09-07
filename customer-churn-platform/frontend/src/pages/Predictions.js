import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { PredictiveAnalytics, TrendingUp } from '@mui/icons-material';
import { apiService } from '../services/api';

const Predictions = () => {
  const [customerIds, setCustomerIds] = useState('');
  const [churnPredictions, setChurnPredictions] = useState([]);
  const [clvPredictions, setClvPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChurnPrediction = async () => {
    if (!customerIds.trim()) {
      setError('Please enter customer IDs');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ids = customerIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (ids.length === 0) {
        setError('Please enter valid customer IDs (comma-separated numbers)');
        return;
      }

      const response = await apiService.predictChurn({ customer_ids: ids });
      setChurnPredictions(response.data.predictions || []);
    } catch (err) {
      setError('Failed to predict churn: ' + (err.response?.data?.message || err.message));
      console.error('Churn prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCLVPrediction = async () => {
    if (!customerIds.trim()) {
      setError('Please enter customer IDs');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ids = customerIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      
      if (ids.length === 0) {
        setError('Please enter valid customer IDs (comma-separated numbers)');
        return;
      }

      const response = await apiService.predictCLV({ customer_ids: ids });
      setClvPredictions(response.data.predictions || []);
    } catch (err) {
      setError('Failed to predict CLV: ' + (err.response?.data?.message || err.message));
      console.error('CLV prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (probability) => {
    if (probability > 0.7) return 'error';
    if (probability > 0.3) return 'warning';
    return 'success';
  };

  const getCLVColor = (value) => {
    if (value > 1000) return 'success';
    if (value > 500) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        ML Predictions
      </Typography>

      {/* Input Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Customer Selection
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Customer IDs (comma-separated)"
              placeholder="1, 2, 3, 4, 5"
              value={customerIds}
              onChange={(e) => setCustomerIds(e.target.value)}
              helperText="Enter customer IDs separated by commas"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PredictiveAnalytics />}
                onClick={handleChurnPrediction}
                disabled={loading}
                fullWidth
              >
                Predict Churn
              </Button>
              <Button
                variant="outlined"
                startIcon={<TrendingUp />}
                onClick={handleCLVPrediction}
                disabled={loading}
                fullWidth
              >
                Predict CLV
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results */}
      <Grid container spacing={3}>
        {/* Churn Predictions */}
        {churnPredictions.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Churn Risk Predictions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {churnPredictions.map((prediction, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1">
                        Customer {prediction.customer_id}
                      </Typography>
                      <Chip
                        label={prediction.risk_level}
                        color={getRiskColor(prediction.churn_probability)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Churn Probability: {(prediction.churn_probability * 100).toFixed(1)}%
                    </Typography>
                    <Box sx={{ mt: 1, height: 8, backgroundColor: 'grey.200', borderRadius: 1 }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${prediction.churn_probability * 100}%`,
                          backgroundColor: getRiskColor(prediction.churn_probability) === 'error' ? 'error.main' :
                                          getRiskColor(prediction.churn_probability) === 'warning' ? 'warning.main' : 'success.main',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        )}

        {/* CLV Predictions */}
        {clvPredictions.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Lifetime Value Predictions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {clvPredictions.map((prediction, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1">
                        Customer {prediction.customer_id}
                      </Typography>
                      <Chip
                        label={prediction.clv_segment}
                        color={getCLVColor(prediction.predicted_clv)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="h6" color="primary">
                      ${prediction.predicted_clv.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Predicted Lifetime Value
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Instructions */}
      {churnPredictions.length === 0 && clvPredictions.length === 0 && !loading && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Predictions Yet
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Enter customer IDs above and click "Predict Churn" or "Predict CLV" to see ML predictions.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Example: Try customer IDs 1, 2, 3, 4, 5
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Predictions;
