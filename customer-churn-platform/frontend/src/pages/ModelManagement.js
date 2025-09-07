import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  ModelTraining,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  DataUsage,
} from '@mui/icons-material';
import { apiService } from '../services/api';

const ModelManagement = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainingResults, setTrainingResults] = useState(null);
  const [etlRunning, setEtlRunning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await apiService.healthCheck();
      setHealthStatus(response.data);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  const handleTrainModels = async () => {
    try {
      setTraining(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.trainModels();
      setTrainingResults(response.data.results);
      setSuccess('Models trained successfully!');
      
      // Refresh health status
      await checkHealth();
    } catch (err) {
      setError('Failed to train models: ' + (err.response?.data?.message || err.message));
      console.error('Training error:', err);
    } finally {
      setTraining(false);
    }
  };

  const handleRunETL = async () => {
    try {
      setEtlRunning(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.runETL();
      setSuccess(`ETL completed successfully! Processed ${response.data.records_processed} records.`);
    } catch (err) {
      setError('Failed to run ETL: ' + (err.response?.data?.message || err.message));
      console.error('ETL error:', err);
    } finally {
      setEtlRunning(false);
    }
  };

  const getModelStatus = (isLoaded) => {
    return isLoaded ? (
      <Chip icon={<CheckCircle />} label="Ready" color="success" size="small" />
    ) : (
      <Chip icon={<Error />} label="Not Trained" color="error" size="small" />
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Model Management & MLOps
      </Typography>

      {/* System Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Health Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1">API Status:</Typography>
              {healthStatus ? (
                <Chip label="Healthy" color="success" size="small" />
              ) : (
                <Chip label="Unknown" color="default" size="small" />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1">Churn Model:</Typography>
              {healthStatus && getModelStatus(healthStatus.models_loaded?.churn_model)}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1">CLV Model:</Typography>
              {healthStatus && getModelStatus(healthStatus.models_loaded?.clv_model)}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Actions */}
      <Grid container spacing={3}>
        {/* Data Pipeline */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DataUsage sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Data Pipeline</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Run ETL pipeline to extract, transform, and load fresh customer data for model training.
              </Typography>
              <Button
                variant="outlined"
                startIcon={etlRunning ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleRunETL}
                disabled={etlRunning}
                fullWidth
              >
                {etlRunning ? 'Running ETL...' : 'Run ETL Pipeline'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Model Training */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ModelTraining sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Model Training</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Train machine learning models with the latest data. This includes churn prediction and CLV models.
              </Typography>
              <Button
                variant="contained"
                startIcon={training ? <CircularProgress size={20} /> : <ModelTraining />}
                onClick={handleTrainModels}
                disabled={training}
                fullWidth
              >
                {training ? 'Training Models...' : 'Train Models'}
              </Button>
              {training && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    This may take a few minutes...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Training Results */}
      {trainingResults && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Latest Training Results
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {trainingResults.churn_model && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Churn Prediction Model
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Accuracy</Typography>
                  <Typography variant="h6">
                    {(trainingResults.churn_model.accuracy * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">AUC Score</Typography>
                  <Typography variant="h6">
                    {trainingResults.churn_model.auc_score.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">CV Mean</Typography>
                  <Typography variant="h6">
                    {(trainingResults.churn_model.cv_mean * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">CV Std</Typography>
                  <Typography variant="h6">
                    {(trainingResults.churn_model.cv_std * 100).toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {trainingResults.clv_model && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Customer Lifetime Value Model
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Train R²</Typography>
                  <Typography variant="h6">
                    {trainingResults.clv_model.train_r2.toFixed(3)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">Test R²</Typography>
                  <Typography variant="h6">
                    {trainingResults.clv_model.test_r2.toFixed(3)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* MLOps Information */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          MLOps Features
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Experiment Tracking
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              All model training runs are tracked with MLflow, including parameters, metrics, and artifacts.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Model Versioning
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Models are automatically versioned and saved with each training run for reproducibility.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Automated Pipeline
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              ETL and training pipelines can be scheduled to run automatically for continuous model updates.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Model Monitoring
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Model performance is monitored in production with drift detection and alerting capabilities.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ModelManagement;
