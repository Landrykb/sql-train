import os
import yaml
import pandas as pd

# Define case metadata for all domains
case_metadata = {
    'business': {
        'basics_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Inspect Sales Rows',
            'description': 'Retrieve top sales rows for a specific branch.',
            'instructions': 'Write a query to select the top 5 sales rows for branch A, ordered by total amount.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter by branch.',
                'Use ORDER BY to sort by total.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'agg_revenue': {
            'tier': 1,
            'prerequisites': ['basics_select'],
            'name': 'Total Revenue by Product',
            'description': 'Calculate total revenue by product line.',
            'instructions': 'Write a query to sum the total revenue for each product line, ordered by revenue.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use SUM to aggregate totals.',
                'Use GROUP BY to group by product_line.',
                'Use ORDER BY to sort results.'
            ]
        },
        'joins_returns': {
            'tier': 2,
            'prerequisites': ['basics_select', 'agg_revenue'],
            'name': 'Returns vs Sales',
            'description': 'Analyze sales with return reasons.',
            'instructions': 'Write a query to join sales and returns, showing sales with return reasons, ordered by total.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include return data.',
                'Filter for non-null return reasons with WHERE.',
                'Use LIMIT to get top 5.'
            ]
        },
        'window_cumsum': {
            'tier': 3,
            'prerequisites': ['basics_select', 'agg_revenue', 'joins_returns'],
            'name': 'Running Monthly Revenue',
            'description': 'Track cumulative revenue for a product line.',
            'instructions': 'Write a query to calculate cumulative revenue for Health and beauty, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use SUM OVER to calculate running totals.',
                'Partition by product_line and order by date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_profit': {
            'tier': 4,
            'prerequisites': ['basics_select', 'agg_revenue', 'joins_returns', 'window_cumsum'],
            'name': 'Profit After Cost',
            'description': 'Calculate net profit by product line.',
            'instructions': 'Write a query to compute net profit (total - cogs) by product line, filtering for profits over 5000.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to calculate profits.',
                'Filter with WHERE for high profits.',
                'Use GROUP BY for aggregation.'
            ]
        },
        'capstone_root': {
            'tier': 5,
            'prerequisites': ['basics_select', 'agg_revenue', 'joins_returns', 'window_cumsum', 'cte_profit'],
            'name': 'Capstone: Return Drivers',
            'description': 'Analyze monthly profit trends.',
            'instructions': 'Write a query to summarize monthly net profit, categorizing high/low profit months.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by month.',
                'Use CASE to categorize profits.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'farming': {
        'ndvi_overview': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Crop Health Overview',
            'description': 'Retrieve top fields by yield.',
            'instructions': 'Write a query to select the top 5 fields with NDVI > 0.5, ordered by yield.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter NDVI.',
                'Use ORDER BY to sort by yield.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'yield_by_crop': {
            'tier': 1,
            'prerequisites': ['ndvi_overview'],
            'name': 'Yield by Crop Type',
            'description': 'Calculate average yield by crop.',
            'instructions': 'Write a query to average yield for each crop type, ordered by yield.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use AVG to calculate means.',
                'Use GROUP BY for crop_type.',
                'Use ORDER BY to sort.'
            ]
        },
        'soil_joins': {
            'tier': 2,
            'prerequisites': ['ndvi_overview', 'yield_by_crop'],
            'name': 'Soil and Crop Analysis',
            'description': 'Join crop and soil data.',
            'instructions': 'Write a query to join crop and soil data, filtering for Loam soil, ordered by NDVI.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include soil data.',
                'Filter with WHERE for soil_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'yield_trend': {
            'tier': 3,
            'prerequisites': ['ndvi_overview', 'yield_by_crop', 'soil_joins'],
            'name': 'Crop Yield Trends',
            'description': 'Track moving average yield for Wheat.',
            'instructions': 'Write a query to calculate a 3-day moving average yield for Wheat, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use AVG OVER with ROWS BETWEEN.',
                'Filter with WHERE for crop_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_soil': {
            'tier': 4,
            'prerequisites': ['ndvi_overview', 'yield_by_crop', 'soil_joins', 'yield_trend'],
            'name': 'High NDVI Soil Analysis',
            'description': 'Analyze high NDVI fields with soil data.',
            'instructions': 'Write a query to find high NDVI fields (> 0.6) with Loam soil, ordered by NDVI.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high NDVI.',
                'Join with soil data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_farm': {
            'tier': 5,
            'prerequisites': ['ndvi_overview', 'yield_by_crop', 'soil_joins', 'yield_trend', 'cte_soil'],
            'name': 'Capstone: Yield Insights',
            'description': 'Summarize crop yield categories.',
            'instructions': 'Write a query to average yield by crop type, categorizing high/low yields.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by crop_type.',
                'Use CASE to categorize yields.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'space': {
        'orbit_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Orbit Data Overview',
            'description': 'Retrieve high-altitude satellites.',
            'instructions': 'Write a query to select the top 5 satellites with altitude > 500, ordered by velocity.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter altitude.',
                'Use ORDER BY to sort by velocity.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'velocity_by_type': {
            'tier': 1,
            'prerequisites': ['orbit_select'],
            'name': 'Velocity by Orbit Type',
            'description': 'Calculate average velocity by orbit type.',
            'instructions': 'Write a query to average velocity for each orbit type, ordered by velocity.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use AVG to calculate means.',
                'Use GROUP BY for orbit_type.',
                'Use ORDER BY to sort.'
            ]
        },
        'mission_joins': {
            'tier': 2,
            'prerequisites': ['orbit_select', 'velocity_by_type'],
            'name': 'Satellite Payloads',
            'description': 'Join satellite and payload data.',
            'instructions': 'Write a query to join satellite and payload data, filtering for Communication payloads, ordered by altitude.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include payload data.',
                'Filter with WHERE for payload_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'orbit_trend': {
            'tier': 3,
            'prerequisites': ['orbit_select', 'velocity_by_type', 'mission_joins'],
            'name': 'Orbit Velocity Trends',
            'description': 'Track moving average velocity for LEO.',
            'instructions': 'Write a query to calculate a 3-day moving average velocity for LEO satellites, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use AVG OVER with ROWS BETWEEN.',
                'Filter with WHERE for orbit_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_payload': {
            'tier': 4,
            'prerequisites': ['orbit_select', 'velocity_by_type', 'mission_joins', 'orbit_trend'],
            'name': 'High Altitude Payloads',
            'description': 'Analyze high-altitude satellites with payloads.',
            'instructions': 'Write a query to find high-altitude satellites (> 550) with Communication payloads, ordered by altitude.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high altitude.',
                'Join with payload data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_space': {
            'tier': 5,
            'prerequisites': ['orbit_select', 'velocity_by_type', 'mission_joins', 'orbit_trend', 'cte_payload'],
            'name': 'Capstone: Orbit Insights',
            'description': 'Summarize orbit velocity categories.',
            'instructions': 'Write a query to average velocity by orbit type, categorizing high/low velocities.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by orbit_type.',
                'Use CASE to categorize velocities.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'crime': {
        'crime_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Crime Incident Overview',
            'description': 'Retrieve recent theft incidents.',
            'instructions': 'Write a query to select the top 5 theft incidents, ordered by date.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter crime_type.',
                'Use ORDER BY to sort by incident_date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'crime_by_area': {
            'tier': 1,
            'prerequisites': ['crime_select'],
            'name': 'Crime by Area',
            'description': 'Count crimes by area.',
            'instructions': 'Write a query to count crimes per area, ordered by count.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use COUNT to tally incidents.',
                'Use GROUP BY for area.',
                'Use ORDER BY to sort.'
            ]
        },
        'suspect_joins': {
            'tier': 2,
            'prerequisites': ['crime_select', 'crime_by_area'],
            'name': 'Crime Suspects',
            'description': 'Join crime and suspect data.',
            'instructions': 'Write a query to join crime and suspect data, showing incidents with suspects, ordered by date.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include suspect data.',
                'Filter with WHERE for non-null suspects.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'crime_trend': {
            'tier': 3,
            'prerequisites': ['crime_select', 'crime_by_area', 'suspect_joins'],
            'name': 'Crime Victim Trends',
            'description': 'Track cumulative victims for theft.',
            'instructions': 'Write a query to calculate cumulative victim counts for theft incidents, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use SUM OVER to calculate running totals.',
                'Filter with WHERE for crime_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_crime': {
            'tier': 4,
            'prerequisites': ['crime_select', 'crime_by_area', 'suspect_joins', 'crime_trend'],
            'name': 'High Crime Areas',
            'description': 'Analyze high-crime areas with theft data.',
            'instructions': 'Write a query to find areas with >100 crimes, joining with theft incidents, ordered by crime count.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high-crime areas.',
                'Join with crime data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_crime': {
            'tier': 5,
            'prerequisites': ['crime_select', 'crime_by_area', 'suspect_joins', 'crime_trend', 'cte_crime'],
            'name': 'Capstone: Crime Insights',
            'description': 'Summarize crime levels by area.',
            'instructions': 'Write a query to count crimes by area, categorizing high/low crime levels.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by area.',
                'Use CASE to categorize crime levels.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'healthcare': {
        'patient_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Patient Overview',
            'description': 'Retrieve recent elderly patients.',
            'instructions': 'Write a query to select the top 5 patients over 50, ordered by admission date.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter age.',
                'Use ORDER BY to sort by admission_date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'diagnosis_count': {
            'tier': 1,
            'prerequisites': ['patient_select'],
            'name': 'Diagnosis Frequency',
            'description': 'Count patients by diagnosis.',
            'instructions': 'Write a query to count patients per diagnosis, ordered by count.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use COUNT to tally patients.',
                'Use GROUP BY for diagnosis.',
                'Use ORDER BY to sort.'
            ]
        },
        'treatment_joins': {
            'tier': 2,
            'prerequisites': ['patient_select', 'diagnosis_count'],
            'name': 'Patient Treatments',
            'description': 'Join patient and treatment data.',
            'instructions': 'Write a query to join patient and treatment data, showing patients with treatments, ordered by date.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include treatment data.',
                'Filter with WHERE for non-null treatments.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'admission_trend': {
            'tier': 3,
            'prerequisites': ['patient_select', 'diagnosis_count', 'treatment_joins'],
            'name': 'Admission Age Trends',
            'description': 'Track moving average age for flu patients.',
            'instructions': 'Write a query to calculate a 3-day moving average age for flu patients, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use AVG OVER with ROWS BETWEEN.',
                'Filter with WHERE for diagnosis.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_treatment': {
            'tier': 4,
            'prerequisites': ['patient_select', 'diagnosis_count', 'treatment_joins', 'admission_trend'],
            'name': 'High-Risk Treatments',
            'description': 'Analyze treatments for elderly patients.',
            'instructions': 'Write a query to find patients over 60 with ACE Inhibitor treatments, ordered by age.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter elderly patients.',
                'Join with treatment data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_health': {
            'tier': 5,
            'prerequisites': ['patient_select', 'diagnosis_count', 'treatment_joins', 'admission_trend', 'cte_treatment'],
            'name': 'Capstone: Diagnosis Insights',
            'description': 'Summarize diagnosis prevalence.',
            'instructions': 'Write a query to count patients by diagnosis, categorizing high/low prevalence.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by diagnosis.',
                'Use CASE to categorize prevalence.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'finance': {
        'transaction_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Transaction Overview',
            'description': 'Retrieve large transactions.',
            'instructions': 'Write a query to select the top 5 transactions over 1000, ordered by date.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter amount.',
                'Use ORDER BY to sort by transaction_date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'balance_by_account': {
            'tier': 1,
            'prerequisites': ['transaction_select'],
            'name': 'Account Balances',
            'description': 'Sum balances by account.',
            'instructions': 'Write a query to sum balances per account, ordered by balance.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use SUM to aggregate amounts.',
                'Use GROUP BY for account_id.',
                'Use ORDER BY to sort.'
            ]
        },
        'fraud_joins': {
            'tier': 2,
            'prerequisites': ['transaction_select', 'balance_by_account'],
            'name': 'Fraud Alerts',
            'description': 'Join transaction and fraud data.',
            'instructions': 'Write a query to join transactions and fraud alerts, showing flagged transactions, ordered by amount.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include fraud data.',
                'Filter with WHERE for non-null fraud types.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'balance_trend': {
            'tier': 3,
            'prerequisites': ['transaction_select', 'balance_by_account', 'fraud_joins'],
            'name': 'Running Balance Trends',
            'description': 'Track running balance for an account.',
            'instructions': 'Write a query to calculate running balance for account A001, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use SUM OVER to calculate running totals.',
                'Filter with WHERE for account_id.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_fraud': {
            'tier': 4,
            'prerequisites': ['transaction_select', 'balance_by_account', 'fraud_joins', 'balance_trend'],
            'name': 'High-Value Fraud Analysis',
            'description': 'Analyze high-value transactions with fraud alerts.',
            'instructions': 'Write a query to find transactions over 1500 with suspicious withdrawal alerts, ordered by amount.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high-value transactions.',
                'Join with fraud data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_finance': {
            'tier': 5,
            'prerequisites': ['transaction_select', 'balance_by_account', 'fraud_joins', 'balance_trend', 'cte_fraud'],
            'name': 'Capstone: Balance Insights',
            'description': 'Summarize account balance categories.',
            'instructions': 'Write a query to sum balances by account, categorizing high/low balances.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by account_id.',
                'Use CASE to categorize balances.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'sports': {
        'match_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Match Overview',
            'description': 'Retrieve high-scoring matches.',
            'instructions': 'Write a query to select the top 5 matches with scores over 50, ordered by date.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter score.',
                'Use ORDER BY to sort by match_date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'score_by_team': {
            'tier': 1,
            'prerequisites': ['match_select'],
            'name': 'Team Performance',
            'description': 'Average scores by team.',
            'instructions': 'Write a query to average scores per team, ordered by score.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use AVG to calculate means.',
                'Use GROUP BY for team.',
                'Use ORDER BY to sort.'
            ]
        },
        'player_joins': {
            'tier': 2,
            'prerequisites': ['match_select', 'score_by_team'],
            'name': 'Player Contributions',
            'description': 'Join match and player data.',
            'instructions': 'Write a query to join match and player data, showing matches with players, ordered by score.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include player data.',
                'Filter with WHERE for non-null players.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'score_trend': {
            'tier': 3,
            'prerequisites': ['match_select', 'score_by_team', 'player_joins'],
            'name': 'Score Trends',
            'description': 'Track moving average scores for basketball.',
            'instructions': 'Write a query to calculate a 3-day moving average score for basketball, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use AVG OVER with ROWS BETWEEN.',
                'Filter with WHERE for sport.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_player': {
            'tier': 4,
            'prerequisites': ['match_select', 'score_by_team', 'player_joins', 'score_trend'],
            'name': 'High-Score Players',
            'description': 'Analyze high-scoring matches with players.',
            'instructions': 'Write a query to find matches with scores over 70 involving John Smith, ordered by score.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high scores.',
                'Join with player data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_sports': {
            'tier': 5,
            'prerequisites': ['match_select', 'score_by_team', 'player_joins', 'score_trend', 'cte_player'],
            'name': 'Capstone: Team Insights',
            'description': 'Summarize team score categories.',
            'instructions': 'Write a query to average scores by team, categorizing high/low scores.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by team.',
                'Use CASE to categorize scores.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
    'social': {
        'post_select': {
            'tier': 1,
            'prerequisites': [],
            'name': 'Post Overview',
            'description': 'Retrieve popular posts.',
            'instructions': 'Write a query to select the top 5 posts with likes over 100, ordered by date.',
            'hints': [
                'Review the select concept in the GuideBook.',
                'Use WHERE to filter likes.',
                'Use ORDER BY to sort by post_date.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'engagement_by_type': {
            'tier': 1,
            'prerequisites': ['post_select'],
            'name': 'Engagement by Post Type',
            'description': 'Average likes by post type.',
            'instructions': 'Write a query to average likes per post type, ordered by likes.',
            'hints': [
                'Review the group concept in the GuideBook.',
                'Use AVG to calculate means.',
                'Use GROUP BY for post_type.',
                'Use ORDER BY to sort.'
            ]
        },
        'user_joins': {
            'tier': 2,
            'prerequisites': ['post_select', 'engagement_by_type'],
            'name': 'User Posts',
            'description': 'Join post and user data.',
            'instructions': 'Write a query to join post and user data, showing posts with users, ordered by likes.',
            'hints': [
                'Review the join concept in the GuideBook.',
                'Use LEFT JOIN to include user data.',
                'Filter with WHERE for non-null users.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'likes_trend': {
            'tier': 3,
            'prerequisites': ['post_select', 'engagement_by_type', 'user_joins'],
            'name': 'Engagement Trends',
            'description': 'Track cumulative likes for videos.',
            'instructions': 'Write a query to calculate cumulative likes for video posts, ordered by date.',
            'hints': [
                'Review the window concept in the GuideBook.',
                'Use SUM OVER to calculate running totals.',
                'Filter with WHERE for post_type.',
                'Use LIMIT to get 5 rows.'
            ]
        },
        'cte_engagement': {
            'tier': 4,
            'prerequisites': ['post_select', 'engagement_by_type', 'user_joins', 'likes_trend'],
            'name': 'High-Engagement Posts',
            'description': 'Analyze high-like posts with users.',
            'instructions': 'Write a query to find posts with likes over 150 by user1, ordered by likes.',
            'hints': [
                'Review the cte concept in the GuideBook.',
                'Use a CTE to filter high likes.',
                'Join with user data.',
                'Use ORDER BY for sorting.'
            ]
        },
        'capstone_social': {
            'tier': 5,
            'prerequisites': ['post_select', 'engagement_by_type', 'user_joins', 'likes_trend', 'cte_engagement'],
            'name': 'Capstone: Engagement Insights',
            'description': 'Summarize post engagement categories.',
            'instructions': 'Write a query to average likes by post type, categorizing high/low engagement.',
            'hints': [
                'Review the subquery and case concepts in the GuideBook.',
                'Use a CTE to group by post_type.',
                'Use CASE to categorize engagement.',
                'Use LIMIT to get 5 rows.'
            ]
        },
    },
}

# Dataset mappings
dataset_files = {
    'business': 'business_retail.csv',
    'farming': 'farming_yield.csv',
    'space': 'space_orbits.csv',
    'crime': 'crime_incidents.csv',
    'healthcare': 'healthcare_patients.csv',
    'finance': 'finance_transactions.csv',
    'sports': 'sports_matches.csv',
    'social': 'social_posts.csv',
}

def main():
    # Load solutions.yaml
    with open('packages/cases/solutions.yaml', 'r') as f:
        solutions = yaml.safe_load(f)

    # Create cases directory if it doesn't exist
    cases_root = 'cases'
    os.makedirs(cases_root, exist_ok=True)

    for domain, cases in solutions.items():
        domain_dir = os.path.join(cases_root, domain)
        os.makedirs(domain_dir, exist_ok=True)

        for case_id, case_data in cases.items():
            # Get metadata
            meta = case_metadata.get(domain, {}).get(case_id, {})
            if not meta:
                print(f"Warning: No metadata for {domain}/{case_id}")
                continue

            # Prepare case YAML
            case_yaml = {
                'id': case_id,
                'name': meta.get('name', case_id.replace('_', ' ').title()),
                'description': meta.get('description', ''),
                'instructions': meta.get('instructions', ''),
                'hints': meta.get('hints', []),
                'skills': case_data.get('skills', []),
                'datasets': [
                    {
                        'name': 'main',
                        'file': dataset_files.get(domain, f'{domain}.csv')
                    }
                ],
                'seedQuery': f'-- TODO: write query for {case_id}\n',
                'templateQuery': '',
                'solutionQuery': case_data.get('solutionQuery', ''),
                'expected': case_data.get('expected', []),
                'domain': domain,
                'prerequisites': meta.get('prerequisites', []),
                'tier': meta.get('tier', 1),
            }

            # Write case YAML
            case_file = os.path.join(domain_dir, f'{case_id}.yaml')
            with open(case_file, 'w') as f:
                yaml.dump(case_yaml, f, sort_keys=False, allow_unicode=True)

            print(f'Generated {case_file}')

if __name__ == '__main__':
    main()