FLOODWATCH
Watching the Inner Niger Delta Flood with NISAR Radar
NASA Space Apps Challenge 2026 | Dancing with the SARs
1. Project Overview
FloodWatch is an interactive web-based project that uses L-band radar observations from the NASA-ISRO NISAR mission to monitor changes in open-water coverage over time. By comparing satellite observations acquired on different dates, FloodWatch presents potential changes through before-and-after images, open-water masks, change maps and statistical visualizations.
The project focuses on the Inner Niger Delta in Mali, where seasonal flooding plays an important role in local livelihoods and wetland ecosystems. The main comparison uses observations from 17 July 2026 and 21 October 2026. Three additional observations are included in a five-date time series.
2. Study Area: Inner Niger Delta, Mali
The study area is around Mopti and Lake Débo, within an approximate extent of 14.5°–15.5° N and 5°–4° W. The Inner Niger Delta is an inland wetland system where the Niger River spreads into channels, lakes, marshes and seasonal floodplains.
Seasonal rainfall and river flow contribute to changes in water levels. The resulting flood cycle supports fishing, rice and cereal cultivation, livestock grazing and habitats for migratory waterbirds. Changes in the timing and extent of flooding can affect both communities and ecosystems.
3. Why This Region Matters
The Inner Niger Delta is an important source of water and natural resources in the Sahel. Seasonal flooding influences fishing areas, agricultural activities, grazing land and wetland habitats. Monitoring surface-water changes can help researchers better understand environmental conditions and water-resource dynamics.
4. How SAR Works
Synthetic Aperture Radar (SAR) sends microwave signals toward Earth's surface and measures the energy scattered back to the satellite. Unlike optical sensors, SAR can collect observations during both day and night and through many cloud conditions.
Smooth open water often appears dark in SAR imagery because much of the incoming radar energy is reflected away from the satellite, resulting in a weak return signal. HH and HV are different polarization channels that provide complementary measurements of radar backscatter. Changes between dates can help identify potential changes in surface conditions.
5. Data Used
The project uses five NASA-ISRO NISAR Level-2 Geocoded Polarimetric Covariance (GCOV) observations. The scenes use L-band data, HH and HV polarization, the same descending orbit direction, track 138 and frame 081.
Observation date	Estimated open-water area
17 July 2026	≈ 1,035 km²
10 August 2026	≈ 1,166 km²
3 September 2026	≈ 1,051 km²
27 September 2026	≈ 1,771 km²
21 October 2026	≈ 3,130 km²
The 15 September 2026 single-polarization scene was excluded because it did not contain both HH and HV channels required by the classification method. The main before-and-after comparison uses 17 July and 21 October; all five selected dates are used in the time-series visualization.
6. Methodology
1.	Five NISAR L-band GCOV observations were selected for the same study area using the same track, frame and descending orbit direction.
2.	The HH and HV covariance bands were read from the HDF5 products. Data were block-averaged from 20 m native pixels to 60 m resolution in linear power and then converted to decibels (dB).
3.	Potential open-water pixels were classified using HH below −19 dB and HV below −24 dB.
4.	A 5 × 5 majority (median) filter was applied to reduce isolated noisy pixels and improve the continuity of classified water areas.
5.	Water masks were compared across dates. Water gain was identified where a later date was classified as open water but the earlier date was not. HH backscatter differences were also examined.
6.	Pixel areas were calculated using the 60 m × 60 m analysis resolution. An approximately 1,525 km² area affected by artificial radar brightening was excluded.
A stricter sensitivity test using HH below −22 dB without smoothing also showed an increase in estimated open-water area (approximately 142 km² to 1,024 km²). This supports the direction of the observed change, although absolute area estimates depend on classification settings.
7. Results
The estimated open-water area increased from approximately 1,035 km² on 17 July 2026 to approximately 3,130 km² on 21 October 2026. This is an increase of approximately 2,095 km², or about 202%, meaning the later estimate is roughly three times the initial estimate.
The five-date time series shows that estimated open-water coverage remained broadly within the 1,000–1,200 km² range from July to early September. A more noticeable increase appeared by 27 September, reaching approximately 1,771 km², followed by 3,130 km² on 21 October.
The largest expansion was observed in the southwestern part of the study area and around river channels. The 21 October observation is the latest date included; the analysis cannot establish whether the water area increased further after that date or whether it reached a seasonal maximum.
8. Interpretation and Environmental Significance
The observed increase is consistent with the seasonal flooding cycle of the Inner Niger Delta. July corresponds to the beginning of the rainy season, while higher seasonal flood levels are generally associated with autumn. However, the observations alone do not establish the exact cause of the changes.
The expansion of open water may affect fishing areas, agricultural activities, livestock access to water and wetland habitats. Some areas around the lake in the northeastern part of the study area showed increased HH backscatter. Possible explanations include wind-roughened water surfaces or interactions involving flooded vegetation, but the available observations cannot distinguish between these possibilities.
9. Limitations
7.	Threshold and filtering sensitivity: Open-water areas were estimated using HH below −19 dB and HV below −24 dB, followed by a 5 × 5 majority filter. Estimates depend on these settings and have not been independently validated using ground-truth data; reported values should therefore be treated as approximate.
8.	Water beneath vegetation: Flooded vegetation may not be detected by this open-water classification, so the actual flooded area may be larger than the estimated open-water area.
9.	Artificial radar brightening: An approximately 1,525 km² area was excluded because of an unexplained artificial brightening effect in the 21 October HV image. Its exact cause was not confirmed, and real surface changes in that area could not be evaluated.
10.	Unexplained HH increase: Some areas around the northeastern lake showed increased HH backscatter. Possible causes include wind-roughened water or interactions involving flooded vegetation. These areas are not directly interpreted as water loss.
11.	Limited observation period: Five observations provide a more detailed seasonal snapshot but do not represent the complete annual flood cycle or allow comparison with previous years. The project therefore does not claim that the 2026 flood was unusually extensive.
12.	Provisional data: The NISAR GCOV products are provisional and may be updated in later releases. Processing-version differences should be considered when interpreting the results.
10. Future Applications
•	Add further NISAR acquisitions to build a longer flood-pulse time series and compare multiple years.
•	Compare radar observations with rainfall and river-level measurements.
•	Integrate independent satellite observations for validation.
•	Improve water classification in areas covered by vegetation.
•	Combine water maps with land-cover and population data to investigate potential impacts on communities and agricultural areas.
•	Explore automatic alerts for unusual changes in water coverage.
11. Conclusion
FloodWatch demonstrates how NISAR L-band SAR observations can be used to investigate changes in open-water coverage over time. In the Inner Niger Delta, the estimated open-water area increased from approximately 1,035 km² on 17 July 2026 to 3,130 km² on 21 October 2026, representing an approximately threefold increase.
The five-date time series shows that estimated open-water coverage remained within a similar range from July to early September before increasing more noticeably from late September onward. Although the estimates are approximate and require independent validation, the project demonstrates the potential of radar satellite observations for monitoring seasonal changes in dynamic wetland environments.
12. References
13.	NASA Science, NISAR Mission Overview: https://science.nasa.gov/mission/nisar/
14.	Alaska Satellite Facility (ASF DAAC), NISAR data access: https://search.asf.alaska.edu/
15.	WWF, Inner Niger Delta Ecoregion: https://www.worldwildlife.org/ecoregions/AT0903
16.	NASA Earth Observatory, An Inland Delta Flooded: https://earthobservatory.nasa.gov/images/147692/an-inland-delta-flooded
17.	NISAR L2 GCOV observations used in this project, distributed through the Alaska Satellite Facility DAAC. Exact product identifiers are documented in the project README.
13. Team
Team member	Role
Doğaca	Data access and SAR analysis
Hasan	Web development and interactive visualization
Meral	Regional research, scientific interpretation and documentation
Zeynep Research Support and Project Coordination
14. Acknowledgements
This project was developed for the NASA Space Apps Challenge 2026 under the challenge "Dancing with the SARs". We acknowledge the NASA-ISRO NISAR mission and the Alaska Satellite Facility DAAC for providing access to the satellite data used in this project.
