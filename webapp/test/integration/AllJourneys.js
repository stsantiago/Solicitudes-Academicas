jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
		"sap/ui/test/Opa5",
		"ean/edu/solicitud/test/integration/pages/Common",
		"sap/ui/test/opaQunit",
		"ean/edu/solicitud/test/integration/pages/Worklist",
		"ean/edu/solicitud/test/integration/pages/Object",
		"ean/edu/solicitud/test/integration/pages/NotFound",
		"ean/edu/solicitud/test/integration/pages/Browser",
		"ean/edu/solicitud/test/integration/pages/App"
	], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "ean.edu.solicitud.view."
	});

	sap.ui.require([
		"ean/edu/solicitud/test/integration/WorklistJourney",
		"ean/edu/solicitud/test/integration/ObjectJourney",
		"ean/edu/solicitud/test/integration/NavigationJourney",
		"ean/edu/solicitud/test/integration/NotFoundJourney",
		"ean/edu/solicitud/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});