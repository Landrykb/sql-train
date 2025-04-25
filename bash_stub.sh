# ─── farming_ndvi.csv ─────────────────────────────────────────────────────────
cat << 'EOF' > datasets/farming_ndvi.csv
id,region,ndvi,actual_yield,year,month
1,North,0.72,3.4,2023,4
2,North,0.75,3.6,2023,5
3,South,0.63,2.8,2023,4
4,South,0.66,3.0,2023,5
5,East,0.81,4.2,2023,4
6,East,0.83,4.4,2023,5
7,West,0.58,2.5,2023,4
8,West,0.60,2.7,2023,5
EOF

# ─── space_neo.csv ───────────────────────────────────────────────────────────
cat << 'EOF' > datasets/space_neo.csv
des,close_approach_date,dist_km,relative_velocity_km_s,is_potentially_hazardous
2025 AB,2025-04-10,120000,5.6,False
2024 XY,2025-04-15,80000,7.2,True
2023 ZZ,2025-04-20,45000,12.4,True
2022 MN,2025-05-01,300000,3.1,False
2021 QT,2025-05-10,95000,6.5,False
EOF

cat << 'EOF' > datasets/crime_chicago.csv
ID,Date,Primary_Type,Location_Description,Longitude,Latitude
10001,2025-04-10T14:23:00,THEFT,STREET,-87.6278,41.8810
10002,2025-04-11T09:15:00,BATTERY,RESIDENCE,-87.6354,41.8745
10003,2025-04-12T22:05:00,ROBBERY,BANK,-87.6201,41.8822
10004,2025-04-13T17:45:00,ASSAULT,APARTMENT,-87.6320,41.8792
10005,2025-04-14T12:10:00,NARCOTICS,SIDEWALK,-87.6297,41.8843
EOF



# ─── finance_stocks.csv ───────────────────────────────────────────────────────
cat << 'EOF' > datasets/finance_stocks.csv
Date,Open,High,Low,Close,Adj Close,Volume
2024-12-01,175.00,177.00,174.00,176.50,176.50,50000000
2024-12-02,176.50,178.25,176.00,177.80,177.80,48000000
2024-12-03,177.80,179.00,177.50,178.90,178.90,51000000
2024-12-04,178.90,180.20,178.00,179.50,179.50,53000000
2024-12-05,179.50,181.00,179.00,180.75,180.75,55000000
EOF


cat > datasets/sports_nba.csv << 'EOF'
Player,Team,Games,Minutes,Points,Assists,Rebounds,Steals,Blocks,Turnovers,PER
LeBron James,LAL,56,35.2,25.3,7.8,7.5,1.2,0.6,3.5,25.7
Stephen Curry,GSW,62,34.1,29.8,6.2,5.1,1.3,0.1,3.2,28.4
Kevin Durant,PHX,54,33.7,27.5,5.1,7.0,0.9,1.1,2.7,26.5
Giannis Antetokounmpo,MIL,58,32.8,28.1,5.9,11.2,1.1,1.3,3.1,29.6
Luka Doncic,DAL,60,34.5,30.2,8.3,9.4,1.0,0.5,4.0,30.4
Nikola Jokic,DEN,61,34.2,26.4,8.3,11.0,1.2,0.7,3.2,31.1
Joel Embiid,PHI,53,33.1,30.6,4.2,11.7,1.0,1.4,2.8,29.0
Ja Morant,MEM,59,33.8,26.9,7.4,5.7,1.7,0.3,3.4,23.5
Kawhi Leonard,LAC,51,31.0,24.8,5.0,6.3,1.8,0.7,2.6,21.9
Jayson Tatum,BOS,60,35.0,26.7,4.3,7.1,1.3,0.8,2.9,25.2
EOF


# ─── social_twitter.csv ─────────────────────────────────────────────────────
cat << 'EOF' > datasets/social_twitter.csv
tweet_id,user_id,created_at,text,hashtags
1001,200,2025-04-10T08:15:00,"Just attended the #DataSci conference!","DataSci"
1002,201,2025-04-10T09:30:00,"SQL is fun 🤓 #SQL #Analytics","SQL,Analytics"
1003,200,2025-04-11T11:00:00,"Analyzing sales trends #Retail #BI","Retail,BI"
1004,202,2025-04-12T14:45:00,"NDVI patterns look promising #AgriTech","AgriTech"
1005,203,2025-04-13T16:20:00,"Tracking NEOs in #Space #Astronomy","Space,Astronomy"
EOF
