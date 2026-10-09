const PEAKS_CSV = String.raw`name,height,prominence,parent,lat,lon,range,country
Everest,8849,8849,,27.99,86.93,Himalayas,China/Nepal
Aconcagua,6961,6961,Everest,-32.65,-70.01,Andes,Argentina
Denali,6190,6155,Aconcagua,63.07,-151.01,Alaska Range,USA
Kilimanjaro,5895,5885,Everest,-3.07,37.36,Eastern Rift,Tanzania
Pico Simón Bolívar,5720,5529,Aconcagua,10.84,-73.69,Sierra Nevada de Santa Marta,Colombia
Mount Logan,5959,5250,Denali,60.57,-140.4,Saint Elias Mtns,Canada
Pico de Orizaba,5636,4922,Mount Logan,19.03,-97.27,Trans-Mexican Volcanic Belt,Mexico
Vinson Massif,4892,4892,Everest,-78.53,-85.62,Sentinel Range,Antarctica
Puncak Jaya,4884,4884,Everest,-4.08,137.18,Sudirman Range,Indonesia
Elbrus,5642,4741,Everest,43.35,42.44,Caucasus,Russia
Mont Blanc,4808,4695,Everest,45.83,6.87,Alps,France/Italy
Damavand,5610,4667,Elbrus,35.96,52.11,Alborz,Iran
Klyuchevskaya Sopka,4750,4649,Everest,56.07,160.63,Kamchatka,Russia
Nanga Parbat,8125,4608,Everest,35.24,74.59,Himalayas,Pakistan
Mauna Kea,4205,4205,Everest,19.82,-155.47,Hawaii,USA
Jengish Chokusu,7439,4148,Everest,42.03,80.13,Tian Shan,China/Kyrgyzstan
Bogda Peak,5445,4122,Everest,43.8,88.34,Bogda Shan,China
Chimborazo,6263,4118,Aconcagua,-1.47,-78.82,Cordillera Occidental,Ecuador
Namcha Barwa,7782,4106,Everest,29.63,95.06,Himalayas,China
Mount Kinabalu,4095,4095,Everest,6.08,116.56,Crocker Range,Malaysia
Mount Rainier,4393,4029,Pico de Orizaba,46.85,-121.76,Cascades,USA
K2,8611,4020,Everest,35.88,76.51,Karakoram,China/Pakistan
Ras Dashen,4550,3997,Kilimanjaro,13.24,38.37,Simien Mtns,Ethiopia
Volcán Tajumulco,4220,3980,Pico de Orizaba,15.03,-91.9,Sierra Madre de Chiapas,Guatemala
Pico Bolívar,4981,3957,Chimborazo,8.54,-71.05,Sierra Nevada de Mérida,Venezuela
Mount Fairweather,4671,3946,Mount Logan,58.91,-137.53,Saint Elias Mtns,Canada/USA
Yushan,3952,3952,Everest,23.47,120.96,Yushan Range,Taiwan
Mount Stanley,5109,3951,Kilimanjaro,0.39,29.87,Rwenzori,DR Congo/Uganda
Kangchenjunga,8586,3922,Everest,27.7,88.13,Himalayas,India/Nepal
Tirich Mir,7708,3908,K2,36.25,71.84,Hindu Kush,Pakistan
Mount Cameroon,4040,3901,Mount Stanley,4.22,9.17,Cameroon line,Cameroon
Mount Kenya,5199,3825,Kilimanjaro,-0.1,37.2,Eastern Rift,Kenya
Mount Kerinci,3805,3805,Everest,-1.7,101.26,Barisan Mtns,Indonesia
Mount Erebus,3794,3794,Everest,-77.53,167.28,Ross Island,Antarctica
Mount Fuji,3776,3776,Everest,35.36,138.73,Honshu,Japan
Toubkal,4167,3757,Mount Stanley,31.06,-7.92,Atlas,Morocco
Cerro Chirripó,3820,3727,Chimborazo,9.48,-83.49,Talamanca,Costa Rica
Mount Rinjani,3726,3726,Everest,-8.42,116.47,Lombok,Indonesia
Aoraki / Mount Cook,3724,3724,Everest,-43.6,170.14,Southern Alps,New Zealand
Teide,3715,3715,Everest,28.27,-16.64,Tenerife,Spain
Mount Boising,4150,3709,Puncak Jaya,-5.8,146.1,Finisterre Range,Papua New Guinea
Monte San Valentín,4058,3696,Aconcagua,-46.6,-73.35,Andes,Chile
Gunnbjørn Fjeld,3694,3694,Everest,68.92,-29.9,Watkins Range,Greenland
Ojos del Salado,6893,3688,Aconcagua,-27.11,-68.54,Andes,Argentina/Chile
Semeru,3676,3676,Everest,-8.1,112.92,Java,Indonesia
Ritacuba Blanco,5410,3645,Chimborazo,6.49,-72.3,Cordillera Oriental,Colombia
Mount Gongga,7556,3642,K2,29.6,101.88,Daxue Shan,China
Mount Ararat,5137,3611,Damavand,39.7,44.3,Armenian Highlands,Turkey
Kongur Tagh,7649,3585,K2,38.59,75.31,Kongur Shan,China
Mount Blackburn,4996,3535,Mount Logan,61.73,-143.44,Wrangell Mtns,USA
`;
