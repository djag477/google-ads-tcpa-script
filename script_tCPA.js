function main() {
  
  var targetROAS = 1.2;
  var today = new Date();
  var dd = String(today.getDate());
  var mm = String(today.getMonth() + 1); //January is 0!
  var yyyy = today.getFullYear();

  today = dd + '/' + mm + '/' + yyyy;

  
  // In order to retrieve the conversion value per ad group, a report is generated in line 20 and it's exported to a google doc for visibility
   
  var ss = SpreadsheetApp.create("Ad group report for tCPA update");
  

	// Let's start by getting all of the AdGroups with a report since there's no method to get the Conversion Value
	Logger.log("Preparing an ad group report");
	
	var ag_Report = AdsApp.report(
       "SELECT AdGroupName, AdGroupId, Cost, Conversions, ConversionValue," +
       "TargetCpa, SearchAbsoluteTopImpressionShare, SearchImpressionShare " +
       "FROM ADGROUP_PERFORMANCE_REPORT " +
       "WHERE CampaignStatus=ENABLED and AdGroupStatus=ENABLED" +
	     "DURING LAST_30_DAYS");
  
  ag_Report.exportToSheet(ss.insertSheet("report " + today));
  Logger.log("Report available at " + ss.getName() + " " + ss.getUrl());
  
	var reportRows = ag_Report.rows();
  
  
  // map object stores several values per ad group ID i.e.: tCPA, Cost, ROAS
  var map = {};

  
  // Metrics from the ad group report
	Logger.log("Starting ad group iteration. Each iteration adds a new ad group into the map object");
	while (reportRows.hasNext()) {
     
    var row = reportRows.next();
    var ag_Name = row['AdGroupName'];
    var ag_ID = row['AdGroupId']
    var convValue = row['ConversionValue'];  
    
    
    if (map[ag_ID] == null) {
      map[ag_ID] = [];
    }
    
    map[ag_ID].push([convValue]);   
    
    Logger.log(map)
    Logger.log( "Ad group name: " + ag_Name + " " + ag_ID + " " + " conversion value: " + convValue);   
    
  }   
  
  Logger.log("Then, for each adgroup loaded to the map object, we are gonna look at its performance and decide according to what their actual ROAS was vs the target ROAS")
  for (var [key, value] in map) {
    Logger.log("Ad group ID: " + key + ". Conversion value stored: " + map[key] + ":" + map);
 
    
    var adgroups = AdsApp.adGroups()
    .withCondition('AdGroupId = "' + key + '"')
    .get();

    
      var adgroup = adgroups.next();
          
      var variation =  ( value / adgroup.getStatsFor("LAST_30_DAYS").getCost()) / targetROAS; 
      Logger.log("Now let's see which condition applies for " + adgroup.getName() + " " + key + " with cost: " + adgroup.getStatsFor("20200801","20201030").getCost() + " variation = " + variation);


      if ( variation < 1.1 && variation > 0.9 ) {
        Logger.log("No need for update. Variation is: " + variation)


      } else if ( variation >= 1.1 || variation <= 0.9) { 
        var new_tCPA = adgroup.bidding().getCpa() * variation;
        if ( variation == 0 ) {
          adgroup.bidding().setCpa(new_tCPA + 0.1);
        }
        Logger.log("New tCPA for ad group " + adgroup.getName() + " is: " + adgroup.bidding().getCpa())
      } else {
        Logger.log("Something went wrong with this ad group: " + adgroup.getName());
      }

  }
  
   
}