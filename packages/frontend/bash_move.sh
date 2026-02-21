#!/usr/bin/env bash

# Business domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/business_retail
# Move existing files if they’re in /cases/business/
for case in basics_select agg_revenue joins_returns window_cumsum cte_profit capstone_root; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/business/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/business/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/business_retail/${case}.yaml
  fi
done

# Crime domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/crime_chicago
for case in crime_select crime_by_area suspect_joins crime_trend cte_crime capstone_crime; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/crime/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/crime/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/crime_chicago/${case}.yaml
  fi
done

# Farming domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/farming_ndvi
for case in ndvi_overview yield_by_crop soil_joins yield_trend cte_soil capstone_farm; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/farming/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/farming/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/farming_ndvi/${case}.yaml
  fi
done

# Finance domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/finance_stocks
for case in transaction_select balance_by_account fraud_joins balance_trend cte_fraud capstone_finance; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/finance/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/finance/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/finance_stocks/${case}.yaml
  fi
done

# Healthcare domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/healthcare_covid
for case in patient_select diagnosis_count treatment_joins admission_trend cte_treatment capstone_health; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/healthcare/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/healthcare/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/healthcare_covid/${case}.yaml
  fi
done

# Social domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/social_twitter
for case in post_select engagement_by_type user_joins likes_trend cte_engagement capstone_social; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/social/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/social/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/social_twitter/${case}.yaml
  fi
done

# Space domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/space_neo
for case in orbit_select velocity_by_type mission_joins orbit_trend cte_payload capstone_space; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/space/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/space/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/space_neo/${case}.yaml
  fi
done

# Sports domain
mkdir -p /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/sports_nba
for case in match_select score_by_team player_joins score_trend cte_player capstone_sports; do
  if [ -f /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/sports/${case}.yaml ]; then
    mv /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/sports/${case}.yaml /Users/apple/VisualStudio/SQL_training_app/besa-sqlverse/packages/frontend/cases/sports_nba/${case}.yaml
  fi
done