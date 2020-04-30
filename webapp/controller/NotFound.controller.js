sap.ui.define([
		"ean/edu/solicitud/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("ean.edu.solicitud.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);