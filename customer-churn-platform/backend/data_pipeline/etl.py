"""ETL pipeline for customer churn data processing."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import text
from typing import Dict, List, Optional
import logging

from config.database import get_connection, engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChurnETLPipeline:
    """ETL pipeline for processing customer churn data."""
    
    def __init__(self):
        self.connection = None
    
    def extract_customer_data(self, start_date: str = None, end_date: str = None) -> pd.DataFrame:
        """Extract customer data from database."""
        logger.info("Extracting customer data...")
        
        query = """
        SELECT 
            c.customer_id,
            c.customer_code,
            c.signup_date,
            c.age,
            c.gender,
            c.location,
            c.subscription_type,
            c.monthly_charges,
            c.total_charges,
            c.contract_length,
            c.payment_method,
            c.paperless_billing,
            CASE WHEN ch.customer_id IS NOT NULL THEN 1 ELSE 0 END as churned,
            ch.churn_date,
            ch.churn_reason
        FROM customers c
        LEFT JOIN churn_events ch ON c.customer_id = ch.customer_id
        """
        
        if start_date and end_date:
            query += f" WHERE c.signup_date BETWEEN '{start_date}' AND '{end_date}'"
        
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        
        logger.info(f"Extracted {len(df)} customer records")
        return df
    
    def extract_usage_data(self, customer_ids: List[int] = None) -> pd.DataFrame:
        """Extract usage metrics data."""
        logger.info("Extracting usage data...")
        
        query = """
        SELECT 
            customer_id,
            metric_date,
            login_count,
            session_duration_minutes,
            features_used,
            support_tickets,
            data_usage_gb
        FROM usage_metrics
        """
        
        if customer_ids:
            customer_ids_str = ','.join(map(str, customer_ids))
            query += f" WHERE customer_id IN ({customer_ids_str})"
        
        query += " ORDER BY customer_id, metric_date"
        
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
        
        logger.info(f"Extracted {len(df)} usage records")
        return df
    
    def transform_features(self, customer_df: pd.DataFrame, usage_df: pd.DataFrame) -> pd.DataFrame:
        """Transform raw data into ML features."""
        logger.info("Transforming features...")
        
        # Calculate customer tenure
        customer_df['signup_date'] = pd.to_datetime(customer_df['signup_date'])
        customer_df['tenure_days'] = (datetime.now() - customer_df['signup_date']).dt.days
        
        # Aggregate usage metrics per customer
        usage_agg = usage_df.groupby('customer_id').agg({
            'login_count': ['mean', 'sum', 'std'],
            'session_duration_minutes': ['mean', 'sum', 'std'],
            'features_used': ['mean', 'max', 'std'],
            'support_tickets': ['sum', 'mean'],
            'data_usage_gb': ['mean', 'sum', 'std']
        }).round(4)
        
        # Flatten column names
        usage_agg.columns = ['_'.join(col).strip() for col in usage_agg.columns]
        usage_agg = usage_agg.reset_index()
        
        # Merge customer and usage data
        features_df = customer_df.merge(usage_agg, on='customer_id', how='left')
        
        # Fill missing values
        numeric_cols = features_df.select_dtypes(include=[np.number]).columns
        features_df[numeric_cols] = features_df[numeric_cols].fillna(0)
        
        # Create derived features
        features_df['avg_session_per_login'] = (
            features_df['session_duration_minutes_mean'] / 
            features_df['login_count_mean'].replace(0, 1)
        ).round(4)
        
        features_df['support_ticket_rate'] = (
            features_df['support_tickets_sum'] / 
            features_df['tenure_days'].replace(0, 1) * 30
        ).round(4)
        
        features_df['engagement_score'] = (
            (features_df['login_count_mean'] * 0.3) +
            (features_df['session_duration_minutes_mean'] / 60 * 0.4) +
            (features_df['features_used_mean'] * 0.3)
        ).round(4)
        
        # Encode categorical variables
        features_df = pd.get_dummies(features_df, columns=[
            'gender', 'subscription_type', 'contract_length', 'payment_method'
        ], prefix_sep='_')
        
        # Convert boolean to int
        bool_cols = features_df.select_dtypes(include=[bool]).columns
        features_df[bool_cols] = features_df[bool_cols].astype(int)
        
        logger.info(f"Transformed features for {len(features_df)} customers")
        return features_df
    
    def load_features(self, features_df: pd.DataFrame) -> None:
        """Load processed features to feature store."""
        logger.info("Loading features to feature store...")
        
        # Prepare feature store data
        feature_store_data = []
        current_date = datetime.now().date()
        
        for _, row in features_df.iterrows():
            feature_record = {
                'customer_id': row['customer_id'],
                'feature_date': current_date,
                'tenure_days': row['tenure_days'],
                'avg_monthly_usage': row.get('data_usage_gb_mean', 0),
                'support_ticket_rate': row['support_ticket_rate'],
                'payment_delay_days': 0,  # Would calculate from payment data
                'feature_adoption_score': row.get('features_used_mean', 0) / 10,
                'engagement_score': row['engagement_score'],
                'churn_risk_score': 0,  # Will be updated by ML model
                'lifetime_value': row['total_charges']
            }
            feature_store_data.append(feature_record)
        
        # Insert into feature store
        feature_store_df = pd.DataFrame(feature_store_data)
        
        with engine.connect() as conn:
            # Delete existing features for today
            conn.execute(text(
                "DELETE FROM feature_store WHERE feature_date = :date"
            ), {"date": current_date})
            
            # Insert new features
            feature_store_df.to_sql(
                'feature_store', 
                conn, 
                if_exists='append', 
                index=False
            )
            conn.commit()
        
        logger.info(f"Loaded {len(feature_store_data)} feature records")
    
    def run_etl_pipeline(self) -> pd.DataFrame:
        """Run complete ETL pipeline."""
        logger.info("Starting ETL pipeline...")
        
        try:
            # Extract data
            customer_df = self.extract_customer_data()
            usage_df = self.extract_usage_data()
            
            # Transform features
            features_df = self.transform_features(customer_df, usage_df)
            
            # Load to feature store
            self.load_features(features_df)
            
            logger.info("ETL pipeline completed successfully")
            return features_df
            
        except Exception as e:
            logger.error(f"ETL pipeline failed: {str(e)}")
            raise

def run_daily_etl():
    """Run daily ETL job."""
    pipeline = ChurnETLPipeline()
    return pipeline.run_etl_pipeline()

if __name__ == "__main__":
    run_daily_etl()
