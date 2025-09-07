"""Customer churn prediction models."""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import xgboost as xgb
import tensorflow as tf
from tensorflow import keras
from sklearn.ensemble import RandomForestRegressor
import joblib
import mlflow
import mlflow.sklearn
import mlflow.tensorflow
from typing import Dict, Tuple, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChurnPredictor:
    """Customer churn prediction model."""
    
    def __init__(self, model_type: str = 'random_forest'):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = None
        self.is_trained = False
        
        # MLflow setup
        mlflow.set_experiment("customer_churn_prediction")
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features for training."""
        logger.info("Preparing features for training...")
        
        # Define feature columns (exclude target and ID columns)
        exclude_cols = [
            'customer_id', 'customer_code', 'churned', 'churn_date', 
            'churn_reason', 'signup_date'
        ]
        
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        # Handle missing values
        X = df[feature_cols].copy()
        X = X.fillna(X.median() if X.select_dtypes(include=[np.number]).shape[1] > 0 else 0)
        
        # Target variable
        y = df['churned'] if 'churned' in df.columns else None
        
        self.feature_columns = feature_cols
        logger.info(f"Prepared {len(feature_cols)} features")
        
        return X, y
    
    def create_model(self) -> Any:
        """Create model based on model_type."""
        if self.model_type == 'random_forest':
            return RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        elif self.model_type == 'xgboost':
            return xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42
            )
        elif self.model_type == 'logistic_regression':
            return LogisticRegression(
                random_state=42,
                max_iter=1000
            )
        elif self.model_type == 'gradient_boosting':
            return GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
        elif self.model_type == 'neural_network':
            return self._create_neural_network()
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")
    
    def _create_neural_network(self) -> keras.Model:
        """Create neural network model."""
        model = keras.Sequential([
            keras.layers.Dense(128, activation='relu', input_shape=(len(self.feature_columns),)),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
        
        return model
    
    def train(self, df: pd.DataFrame, test_size: float = 0.2) -> Dict[str, Any]:
        """Train the churn prediction model."""
        logger.info(f"Training {self.model_type} model...")
        
        with mlflow.start_run(run_name=f"churn_{self.model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            # Prepare features
            X, y = self.prepare_features(df)
            
            if y is None:
                raise ValueError("Target variable 'churned' not found in dataset")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, stratify=y
            )
            
            # Scale features for certain models
            if self.model_type in ['logistic_regression', 'neural_network']:
                X_train_scaled = self.scaler.fit_transform(X_train)
                X_test_scaled = self.scaler.transform(X_test)
            else:
                X_train_scaled = X_train
                X_test_scaled = X_test
            
            # Create and train model
            self.model = self.create_model()
            
            if self.model_type == 'neural_network':
                # Train neural network
                history = self.model.fit(
                    X_train_scaled, y_train,
                    epochs=50,
                    batch_size=32,
                    validation_split=0.2,
                    verbose=0
                )
                
                # Log neural network metrics
                mlflow.log_param("epochs", 50)
                mlflow.log_param("batch_size", 32)
                
            else:
                # Train sklearn models
                self.model.fit(X_train_scaled, y_train)
            
            # Make predictions
            if self.model_type == 'neural_network':
                y_pred_proba = self.model.predict(X_test_scaled).flatten()
                y_pred = (y_pred_proba > 0.5).astype(int)
            else:
                y_pred = self.model.predict(X_test_scaled)
                y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
            
            # Calculate metrics
            accuracy = np.mean(y_pred == y_test)
            auc_score = roc_auc_score(y_test, y_pred_proba)
            
            # Cross-validation for sklearn models
            if self.model_type != 'neural_network':
                cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
                cv_mean = cv_scores.mean()
                cv_std = cv_scores.std()
            else:
                cv_mean = cv_std = 0
            
            # Log parameters and metrics
            mlflow.log_param("model_type", self.model_type)
            mlflow.log_param("test_size", test_size)
            mlflow.log_param("n_features", len(self.feature_columns))
            mlflow.log_param("n_samples", len(X))
            
            mlflow.log_metric("accuracy", accuracy)
            mlflow.log_metric("auc_score", auc_score)
            mlflow.log_metric("cv_mean", cv_mean)
            mlflow.log_metric("cv_std", cv_std)
            
            # Log model
            if self.model_type == 'neural_network':
                mlflow.tensorflow.log_model(self.model, "model")
            else:
                mlflow.sklearn.log_model(self.model, "model")
            
            # Feature importance for tree-based models
            feature_importance = None
            if hasattr(self.model, 'feature_importances_'):
                feature_importance = dict(zip(self.feature_columns, self.model.feature_importances_))
                # Log top 10 features
                top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]
                for i, (feature, importance) in enumerate(top_features):
                    mlflow.log_metric(f"feature_importance_{i+1}_{feature}", importance)
            
            self.is_trained = True
            
            results = {
                'accuracy': accuracy,
                'auc_score': auc_score,
                'cv_mean': cv_mean,
                'cv_std': cv_std,
                'feature_importance': feature_importance,
                'classification_report': classification_report(y_test, y_pred),
                'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
            }
            
            logger.info(f"Model training completed. Accuracy: {accuracy:.4f}, AUC: {auc_score:.4f}")
            return results
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict churn probability."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Ensure features match training data
        X_features = X[self.feature_columns].fillna(0)
        
        # Scale if necessary
        if self.model_type in ['logistic_regression', 'neural_network']:
            X_features = self.scaler.transform(X_features)
        
        if self.model_type == 'neural_network':
            predictions = self.model.predict(X_features).flatten()
        else:
            predictions = self.model.predict_proba(X_features)[:, 1]
        
        return predictions
    
    def save_model(self, filepath: str) -> None:
        """Save trained model to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'model_type': self.model_type
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """Load trained model from disk."""
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_columns = model_data['feature_columns']
        self.model_type = model_data['model_type']
        self.is_trained = True
        
        logger.info(f"Model loaded from {filepath}")

class LifetimeValuePredictor:
    """Customer lifetime value prediction model."""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = None
        self.is_trained = False
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features for CLV prediction."""
        exclude_cols = [
            'customer_id', 'customer_code', 'churned', 'churn_date',
            'churn_reason', 'signup_date', 'total_charges'
        ]
        
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        X = df[feature_cols].fillna(0)
        y = df['total_charges'] if 'total_charges' in df.columns else None
        
        self.feature_columns = feature_cols
        return X, y
    
    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train CLV prediction model."""
        logger.info("Training CLV prediction model...")
        
        X, y = self.prepare_features(df)
        
        if y is None:
            raise ValueError("Target variable 'total_charges' not found")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        self.is_trained = True
        
        return {
            'train_r2': train_score,
            'test_r2': test_score
        }
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict customer lifetime value."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        X_features = X[self.feature_columns].fillna(0)
        X_scaled = self.scaler.transform(X_features)
        
        return self.model.predict(X_scaled)
