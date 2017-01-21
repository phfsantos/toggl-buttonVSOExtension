import PomoTogglTimerGroup from "./lib/PomoTogglTimerGroup";
import PomoTogglTimerSettings from "./lib/PomoTogglTimerSettings";

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformScripts: true,
    usePlatformStyles: true
});

VSS.require([
    "TFS/WorkItemTracking/Services",
    "VSS/Authentication/Services",
    "VSS/Controls",
    "VSS/Controls/StatusIndicator"
], (_WorkItemServices, AuthenticationService, Controls, StatusIndicator) => {
    // get the WorkItemFormService. 
    // this service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService() {
        return _WorkItemServices.WorkItemFormService.getService();
    }

    getWorkItemFormService().then((WorkItemFormService) => {
        VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService) => {
            var pomoTogglTimerGroup = new PomoTogglTimerGroup(WorkItemFormService,
                                                              AuthenticationService,
                                                              Controls,
                                                              StatusIndicator,
                                                              dataService);
            VSS.register("pomoTogglTimerGroup", pomoTogglTimerGroup);
        });
    });
});

// ready
VSS.ready(() => {
    // get the data service
    VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService) => {
        var pomoTogglTimerSettings = new PomoTogglTimerSettings(dataService);
        VSS.register("PomoTogglTimerSettings", pomoTogglTimerSettings);
    });

    // notify loaded
    VSS.notifyLoadSucceeded();
});