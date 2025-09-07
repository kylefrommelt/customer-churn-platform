"""Flask API for customer churn prediction platform."""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
import logging
import os
import traceback

from models.churn_predictor import ChurnPredictor, LifetimeValuePredictor
from data_pipeline.etl import ChurnETLPipeline
from config.database import init_db, get_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global model instances
churn_model = None
clv_model = None

def load_models():
    """Load trained models."""
    global churn_model, clv_model
    
    try:
        # Initialize models
        churn_model = ChurnPredictor(model_type='random_forest')
        clv_model = LifetimeValuePredictor()
        
        # Try to load existing models
        if os.path.exists('models/churn_model.joblib'):
            churn_model.load_model('models/churn_model.joblib')
            logger.info("Loaded existing churn model")
        
        if os.path.exists('models/clv_model.joblib'):
            clv_model.load_model('models/clv_model.joblib')
            logger.info("Loaded existing CLV model")
            
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'models_loaded': {
            'churn_model': churn_model is not None and churn_model.is_trained,
            'clv_model': clv_model is not None and clv_model.is_trained
        }
    })

@app.route('/api/train', methods=['POST'])
def train_models():
    """Train ML models with current data."""
    try:
        # Run ETL pipeline to get fresh features
        etl_pipeline = ChurnETLPipeline()
        features_df = etl_pipeline.run_etl_pipeline()
        
        results = {}
        
        # Train churn model
        if churn_model:
            churn_results = churn_model.train(features_df)
            results['churn_model'] = churn_results
            
            # Save model
            os.makedirs('models', exist_ok=True)
            churn_model.save_model('models/churn_model.joblib')
        
        # Train CLV model (if we have the data)
        if clv_model and 'total_charges' in features_df.columns:
            clv_results = clv_model.train(features_df)
            results['clv_model'] = clv_results
            
            # Save model
            clv_model.save_model('models/clv_model.joblib')
        
        return jsonify({
            'status': 'success',
            'message': 'Models trained successfully',
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/predict/churn', methods=['POST'])
def predict_churn():
    """Predict churn probability for customers."""
    try:
        if not churn_model or not churn_model.is_trained:
            return jsonify({
                'status': 'error',
                'message': 'Churn model not trained. Please train the model first.'
            }), 400
        
        data = request.get_json()
        
        if 'customer_ids' in data:
            # Predict for specific customers
            customer_ids = data['customer_ids']
            
            # Get customer features from database
            etl_pipeline = ChurnETLPipeline()
            customer_df = etl_pipeline.extract_customer_data()
            usage_df = etl_pipeline.extract_usage_data(customer_ids)
            features_df = etl_pipeline.transform_features(customer_df, usage_df)
            
            # Filter for requested customers
            features_df = features_df[features_df['customer_id'].isin(customer_ids)]
            
        elif 'features' in data:
            # Predict with provided features
            features_df = pd.DataFrame(data['features'])
            
        else:
            return jsonify({
                'status': 'error',
                'message': 'Either customer_ids or features must be provided'
            }), 400
        
        # Make predictions
        predictions = churn_model.predict(features_df)
        
        # Prepare response
        results = []
        for i, (_, row) in enumerate(features_df.iterrows()):
            results.append({
                'customer_id': int(row.get('customer_id', i)),
                'churn_probability': float(predictions[i]),
                'risk_level': 'High' if predictions[i] > 0.7 else 'Medium' if predictions[i] > 0.3 else 'Low'
            })
        
        return jsonify({
            'status': 'success',
            'predictions': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/predict/clv', methods=['POST'])
def predict_clv():
    """Predict customer lifetime value."""
    try:
        if not clv_model or not clv_model.is_trained:
            return jsonify({
                'status': 'error',
                'message': 'CLV model not trained. Please train the model first.'
            }), 400
        
        data = request.get_json()
        
        if 'customer_ids' in data:
            customer_ids = data['customer_ids']
            
            # Get customer features
            etl_pipeline = ChurnETLPipeline()
            customer_df = etl_pipeline.extract_customer_data()
            usage_df = etl_pipeline.extract_usage_data(customer_ids)
            features_df = etl_pipeline.transform_features(customer_df, usage_df)
            
            features_df = features_df[features_df['customer_id'].isin(customer_ids)]
            
        elif 'features' in data:
            features_df = pd.DataFrame(data['features'])
            
        else:
            return jsonify({
                'status': 'error',
                'message': 'Either customer_ids or features must be provided'
            }), 400
        
        # Make predictions
        predictions = clv_model.predict(features_df)
        
        # Prepare response
        results = []
        for i, (_, row) in enumerate(features_df.iterrows()):
            results.append({
                'customer_id': int(row.get('customer_id', i)),
                'predicted_clv': float(predictions[i]),
                'clv_segment': 'High Value' if predictions[i] > 1000 else 'Medium Value' if predictions[i] > 500 else 'Low Value'
            })
        
        return jsonify({
            'status': 'success',
            'predictions': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"CLV prediction error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/customers', methods=['GET'])
def get_customers():
    """Get customer list with basic info."""
    try:
        etl_pipeline = ChurnETLPipeline()
        customer_df = etl_pipeline.extract_customer_data()
        
        # Convert to list of dictionaries
        customers = customer_df.to_dict('records')
        
        # Convert numpy types to Python types for JSON serialization
        for customer in customers:
            for key, value in customer.items():
                if isinstance(value, (np.integer, np.floating)):
                    customer[key] = value.item()
                elif pd.isna(value):
                    customer[key] = None
        
        return jsonify({
            'status': 'success',
            'customers': customers,
            'count': len(customers)
        })
        
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get dashboard analytics data."""
    try:
        etl_pipeline = ChurnETLPipeline()
        customer_df = etl_pipeline.extract_customer_data()
        
        # Calculate key metrics
        total_customers = len(customer_df)
        churned_customers = customer_df['churned'].sum()
        churn_rate = churned_customers / total_customers if total_customers > 0 else 0
        
        # Revenue metrics
        total_revenue = customer_df['total_charges'].sum()
        avg_revenue_per_customer = customer_df['total_charges'].mean()
        
        # Subscription type distribution
        subscription_dist = customer_df['subscription_type'].value_counts().to_dict()
        
        # Churn by subscription type
        churn_by_subscription = customer_df.groupby('subscription_type')['churned'].agg(['count', 'sum']).to_dict()
        
        return jsonify({
            'status': 'success',
            'metrics': {
                'total_customers': int(total_customers),
                'churned_customers': int(churned_customers),
                'churn_rate': float(churn_rate),
                'total_revenue': float(total_revenue),
                'avg_revenue_per_customer': float(avg_revenue_per_customer)
            },
            'distributions': {
                'subscription_types': subscription_dist,
                'churn_by_subscription': churn_by_subscription
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/etl/run', methods=['POST'])
def run_etl():
    """Manually trigger ETL pipeline."""
    try:
        etl_pipeline = ChurnETLPipeline()
        features_df = etl_pipeline.run_etl_pipeline()
        
        return jsonify({
            'status': 'success',
            'message': 'ETL pipeline completed successfully',
            'records_processed': len(features_df),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"ETL error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Load models
    load_models()
    
    # Run app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    app.run(host='0.0.0.0', port=port, debug=debug)
