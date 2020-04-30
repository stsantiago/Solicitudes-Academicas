sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function(jQuery, Controller, JSONModel, MessageToast, MessageBox) {
	"use strict";

	var history = {
		prevPaymentSelect: null,
		prevDiffDeliverySelect: null,
		prevSolicitudtSelect: null
	};

	var WizardController = Controller.extend("ean.edu.solicitud.controller.init", {
		onInit: function() {
			var that = this;
			var modeloGeneral = this.getOwnerComponent().getModel();
			this._wizard = this.getView().byId("WizardSolicitudes");
			this._oNavContainer = this.getView().byId("wizardNavContainer");
			this._oWizardContentPage = this.getView().byId("wizardContentPage");
			this._oWizardReviewPage = sap.ui.xmlfragment("ean.edu.solicitud.view.ReviewPage", this);
			this._WizardReviewPage = this.getView().byId("wizardBranchingReviewPage");
			this._oNavContainer.addPage(this._oWizardReviewPage);
			this._objidEstudiante = "";
			this._oSede = "";
			this._oTipo = "";
			this._oMessg = "";
			this._oFlgMsg = true;
			this._oSelSolicitud = [];
			this._oSelPrograma = [];
			this._oSolAdic = [];
			this._oSolAdic.push({
				tipo:		"",
				cant:		1,
				observ:		""
			});
			this.getView().byId("tipoSolicitudSelection").setSelectedKey("Certificados");
			modeloGeneral.setUseBatch(false);
			this.getEstudiante();
			this.model = new sap.ui.model.json.JSONModel();
			this.model.attachRequestCompleted(null, function() {
				that.model.setProperty("/selectedTiposol", "Generales");
			});

		},
		getEstudiante: function() {
			var that = this;
			var oView = this.getView();
			var modeloGeneral = this.getOwnerComponent().getModel();
			var sPathEstudiante = "/EstudianteSet";
			modeloGeneral.read(sPathEstudiante, {
				success: function(oData, oResponse) {
					var d = oData.results[0].FecSolicitud;
					that._objidEstudiante = oData.results[0].StudentObjid;
					oView.byId("fechaSolicitud").setValue(that.formatDate(d));
					oView.byId("nomEstudiante").setValue(oData.results[0].StudentName);
					oView.byId("apeEstudiante").setValue(oData.results[0].StudentLastName);
					oView.byId("mailEstudiante").setValue(oData.results[0].StudentMail);
					oView.byId("docEstudiante").setValue(oData.results[0].StudentDni);
					oView.byId("semestre").setValue(oData.results[0].StudentPer);
					that._oSede = oData.results[0].Sede;
				},
				error: function(oData, oResponse) {
					that.showDialog("El estudiante no se encuentra Registrado en el sistema");
					// busyDialog.close();
				}
			});
		},
		getMensaje: function() {
			var that = this;
			var oView = this.getView();
			var plann = oView.byId("oSProgramas").getSelectedItem().getKey();
			var peryr = oView.byId("oSAnio").getSelectedItem().getKey();
			var perid = oView.byId("oSPeriodo").getSelectedItem().getKey();
			var stobjid = this._objidEstudiante;
			var tipo = this._oTipo;
			var sede = this._oSede;
			var sPathMsg;
			if (this._oSelSolicitud[0].reint) {
				sPathMsg = "/MensajeReintSet(Tipo='" + tipo + "',StudentObjid='" + stobjid + "',Plann='" + plann + "',Peryr='" + peryr +
					"',Perid='" + perid + "')";
				this.showMensaje(sPathMsg, true);
			}
			sPathMsg = "/MensajesSedeSet(Sede='" + sede + "',Tipo='" + tipo + "')";
			this.showMensaje(sPathMsg, false);
		},
		showMensaje: function(path, reint) {
			var that = this;
			var oView = this.getView();
			var modeloGeneral = this.getOwnerComponent().getModel();
			modeloGeneral.read(path, {
				success: function(oData, oResponse) {
					that._oMessg = oData.Mensaje;
					if (oData.Acepta) {
						that.showMsgAccept();
						that._oFlgMsg = true;
					} else {
						that.showMsgInfo();
						if (reint !== true) {
							that._oFlgMsg = false;
						}
						that.validateStep(oView.byId("SolGeneralStep"));
					}
				},
				error: function(oData, oResponse) {
					that.validateStep(oView.byId("SolGeneralStep"));
					that._oFlgMsg = false;
					// that.showDialog("El estudiante no se encuentra Registrado en el sistema");
					// busyDialog.close();
				}
			});
		},
		getProgData: function() {
			var oView = this.getView();
			var that = this;
			var programasPath = "/ProgramasSet";
			var aProgramas = [];
			var modeloGeneral = this.getOwnerComponent().getModel();
			var filterProgramas = [
				new sap.ui.model.Filter("StudentId", sap.ui.model.FilterOperator.EQ, that._objidEstudiante)
			];
			var oSProgramas = this.getView().byId("oSProgramas");
			modeloGeneral.read(programasPath, {
				filters: filterProgramas,
				// and: true,
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oProgramas;
						oProgramas = oData.results[j];
						aProgramas.push(oProgramas);
					}
					var oModelProgramas = new sap.ui.model.json.JSONModel();
					oModelProgramas.setData({
						"ProgramasSet": aProgramas
					});
					oSProgramas.setModel(oModelProgramas);
				},
				error: function(oData, oResponse) {
					that.showDialog("Error leyendo datos de los programas");
					// that.getView().byId("BusyDialog").close();
				}
			});
			that.invalidateStep(oView.byId("ProgramasStep"));
		},
		onSelectProg: function(evt) {
			var oView = this.getView();
			var aProgAnio = [];
			var oSAnio = oView.byId("oSAnio");
			var item = sap.ui.getCore().getControl(evt.getSource().getId()).getSelectedItem();
			var sPath = "/ProgramasSet(StudentId='" + this._objidEstudiante + "',ProgramaId='" + item.getKey() + "')/ToProgramaPeriodo";
			var modeloGeneral = this.getOwnerComponent().getModel();
			oView.byId("oSAnio").setSelectedKey("");
			oView.byId("oSPeriodo").setSelectedKey("");
			this.invalidateStep(oView.byId("ProgramasStep"));
			modeloGeneral.read(sPath, {
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oProganio;
						oProganio = oData.results[j];
						aProgAnio.push(oProganio);
					}
					var oModelProganio = new sap.ui.model.json.JSONModel();
					oModelProganio.setData({
						"ProgramasAnio": aProgAnio
					});
					oSAnio.setModel(oModelProganio);
				},
				error: function(oData, oResponse) {
					this.showDialog("El estudiante no esta registrado en ningun programa");
				}
			});
		},
		onSelectAnio: function(evt) {
			var that = this;
			var oView = this.getView();
			var aProgPer = [];
			var oSPeriodo = oView.byId("oSPeriodo");
			var prog = oView.byId("oSProgramas").getSelectedItem().getKey();
			var item = sap.ui.getCore().getControl(evt.getSource().getId()).getSelectedItem();
			var sPath = "/PeriodoAnioSet(StudentObjid='" + this._objidEstudiante + "',ProgramaId='" + prog + "',ProgramaAnio='" + item.getKey() +
				"')/ToAnioPeriodo";
			oView.byId("oSPeriodo").setSelectedKey("");
			this.invalidateStep(oView.byId("ProgramasStep"));
			var modeloGeneral = this.getOwnerComponent().getModel();
			modeloGeneral.read(sPath, {
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oProgper;
						oProgper = oData.results[j];
						aProgPer.push(oProgper);
					}
					var oModelProgper = new sap.ui.model.json.JSONModel();
					oModelProgper.setData({
						"ProgramasPer": aProgPer
					});
					oSPeriodo.setModel(oModelProgper);
				},
				error: function(oData, oResponse) {
					this.showDialog("El estudiante no esta registrado en ningun programa");
				}
			});
		},
		onSelectPer: function(evt) {
			var that = this;
			var oView = this.getView();
			var prog = oView.byId("oSProgramas").getSelectedItem().getKey();
			var anio = oView.byId("oSAnio").getSelectedItem().getKey();
			var per = sap.ui.getCore().getControl(evt.getSource().getId()).getSelectedItem();
			if (prog !== "" || per !== "" || anio !== "") {
				this.validateStep(oView.byId("ProgramasStep"));
			} else {
				this.invalidateStep(oView.byId("ProgramasStep"));
			}
		},
		getSolicitud: function() {
			var that = this;
			var oView = this.getView();
			var oSSolicitudes = oView.byId("oSSolicitud");
			var aSolicitudes = [];
			var modeloGeneral = this.getOwnerComponent().getModel();
			var sPathSolicitudes = "/SolicitudesSet";
			modeloGeneral.read(sPathSolicitudes, {
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oSolicitudes;
						oSolicitudes = oData.results[j];
						aSolicitudes.push(oSolicitudes);
					}
					var oModelSolicitudes = new sap.ui.model.json.JSONModel();
					oModelSolicitudes.setData({
						"SolicitudesSet": aSolicitudes
					});
					oSSolicitudes.setModel(oModelSolicitudes);
				},
				error: function(oData, oResponse) {
					that.showDialog("No hay solicitudes disponibles");
				}
			});
			that.invalidateStep(oView.byId("SolGeneralStep"));
		},
		onSelectSol: function(evt) {
			var that = this;
			var oView = this.getView();
			var item = sap.ui.getCore().getControl(evt.getSource().getId()).getSelectedItem();
			var obj = item.getBindingContext().getObject();
			that._oSelSolicitud = [];
			if (item.getKey() !== "") {
				that._oSelSolicitud.push({
					noSolicitud: obj.SolicitudId,
					descripcion: obj.SolicitudTxt,
					liquida: obj.SolicitudLiq,
					reint: obj.SolicitudReint,
					cantidad: 1,
					precio: obj.SolicitudVlr,
					observ: ""
				});
				that._oTipo = obj.SolicitudId;
				this.getMensaje();
			} else {
				that.invalidateStep(oView.byId("SolGeneralStep"));
			}
			if (that._oSelSolicitud[0].liquida) {
				that.getView().byId("BtnConf").setVisible(false);
				that.validateStep(oView.byId("ResumenStep"));
			} else {
				that.getView().byId("BtnConf").setVisible(true);
				that.invalidateStep(oView.byId("ResumenStep"));
				var selectedKey = this.getView().byId("tipoSolicitudSelection").getSelectedKey();
			}

		},
		getCertificado: function(){
			var that = this;
			var oView = this.getView();
			var oSSCertifica = oView.byId("oSCertifica");
			var aCertifica = [];
			var modeloGeneral = this.getOwnerComponent().getModel();
			var sPathCertifica = "/CertificadosSet";
			modeloGeneral.read(sPathCertifica, {
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oCertifica;
						oCertifica = oData.results[j];
						aCertifica.push(oCertifica);
					}
					var oModelCertifica = new sap.ui.model.json.JSONModel();
					oModelCertifica.setData({
						"CertificadoSet": aCertifica
					});
					oSSCertifica.setModel(oModelCertifica);
				},
				error: function(oData, oResponse) {
					that.showDialog("No hay certificados disponibles");
				}
			});
			that.invalidateStep(oView.byId("SolCertificaStep"));
			
		},
		onSelectCert: function(evt){
			var that = this;
			var oView = this.getView();
			var item = sap.ui.getCore().getControl(evt.getSource().getId()).getSelectedItem();
			var obj = item.getBindingContext().getObject();
			var cant = oView.byId("inCant").getValue();
			that._oSelSolicitud = [];
			if (item.getKey() !== "") {
				that._oSelSolicitud.push({
					noSolicitud: obj.CertificadoId,
					descripcion: obj.CertificadoTxt,
					liquida: obj.CertificadoLiq,
					cantidad: cant,
					precio: obj.CertificadoVlr,
					observ: ""
				});
				that._oTipo = obj.CertificadoId;
				that.validateStep(oView.byId("SolCertificaStep"));
			} else {
				that.invalidateStep(oView.byId("SolCertificaStep"));
			}
			if (that._oSelSolicitud[0].liquida) {
				that.getView().byId("BtnConf").setVisible(false);
				// that.validateStep(oView.byId("ResumenStep"));
			} else {
				that.getView().byId("BtnConf").setVisible(true);
				// that.invalidateStep(oView.byId("ResumenStep"));
			}
		},
		onCant: function(evt){
			var that = this;
			var oView = this.getView();
			var cant = evt.getParameters().value;
			if (cant <= 0) {
				
				that.invalidateStep(oView.byId("SolCertificaStep"));
			}else{
				that.validateStep(oView.byId("SolCertificaStep"));
			}
		},
		loadHistorico: function() {
			var that = this;
			var oTable = this.byId("idResumenTable");
			var oModelHist = new sap.ui.model.json.JSONModel();
			var modeloGeneral = this.getOwnerComponent().getModel();
			var tipoSol = true;
			var selectedKey = this.getView().byId("tipoSolicitudSelection").getSelectedKey();
			if (selectedKey === "Certificados") {
				tipoSol = false;
			}
			var sPathHistorico = "/HistoricoSet";
			var filterHist = [
				new sap.ui.model.Filter("StudentObjid", sap.ui.model.FilterOperator.EQ, that._objidEstudiante),
				new sap.ui.model.Filter("Generales", sap.ui.model.FilterOperator.EQ, tipoSol)
			];
			var columnData = [{
				columnName: "Solicitud",
				columnLabel: "Solicitud"
			}, {
				columnName: "Fecha",
				columnLabel: "Fecha"
			}, {
				columnName: "Estado",
				columnLabel: "Estado"
			}, {
				columnName: "Status",
				columnLabel: "Pago"
			}, {
				columnName: "Observaciones",
				columnLabel: "Observaciones"
			}, {
				columnName: "Comentarios",
				columnLabel: "Comentarios"
			}, {
				columnName: "Usuario",
				columnLabel: "Usuario"
			}];

			var rowData = [];
			modeloGeneral.read(sPathHistorico, {
				filters: filterHist,
				success: function(oData, oResponse) {
					for (var j = 0; j < oData.results.length; j++) {
						var oHistorico;
						oHistorico = oData.results[j];
						oHistorico.Fecha = that.formatDate(oHistorico.Fecha);
						if (oHistorico.Fecha_libera !== null) {
							oHistorico.Fecha_libera = that.formatDate(oHistorico.Fecha_libera);
						}
						rowData.push(oHistorico);
					}
					oModelHist.setData({
						rows: rowData,
						columns: columnData
					});
					oTable.setModel(oModelHist);
					oTable.bindAggregation("columns", "/columns", function(index, context) {
						if (context.getObject().columnLabel === "Solicitud") {
							return new sap.m.Column({
								header: new sap.m.Label({
									text: context.getObject().columnLabel
								}),
								hAlign: "Left"

							});
						} else if (context.getObject().columnLabel === "Estado") {
							return new sap.m.Column({
								header: new sap.m.Label({
									text: context.getObject().columnLabel
								}),
								hAlign: "Right"

							});
						} else {
							return new sap.m.Column({
								header: new sap.m.Label({
									text: context.getObject().columnLabel
								}),
								demandPopin: true,
								minScreenWidth: "Tablet",
								hAlign: "Left"
							});
						}
					});

					oTable.bindItems("/rows", function(index, context) {
						var obj = context.getObject();
						var row = new sap.m.ColumnListItem();
						row.addCell(
							new sap.m.ObjectIdentifier({
								title: obj.Solicitud,
								text: obj.Tipo
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								text: obj.Fecha
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								title: obj.Estado,
								text: obj.Fecha_libera
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								text: obj.Status
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								text: obj.Observaciones
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								text: obj.Comentarios
							})
						);
						row.addCell(
							new sap.m.ObjectIdentifier({
								text: obj.Usuario
							})
						);
						return row;
					});
				},
				error: function(oData, oResponse) {
					this.showDialog("No fue posible cargar el histórico de solicitudes");
				}
			});
		},
		showDialog: function(oText) {
			sap.m.MessageToast.show(oText, {
				duration: 6000
			});
		},
		formatDate: function(date) {
			var d = new Date(date),
				month = '' + (d.getMonth() + 1),
				day = '' + (d.getDate() + 1),
				year = d.getFullYear();
			if (month.length < 2) {
				month = '0' + month;
			}
			if (day.length < 2) {
				day = '0' + day;
			}
			return [day, month, year].join('/');
		},
		formatDateToString: function(date) {
			var d = new Date(date),
				month = '' + (d.getMonth() + 1),
				day = '' + d.getDate(),
				year = d.getFullYear();
			if (month.length < 2) {
				month = '0' + month;
			}
			if (day.length < 2) {
				day = '0' + day;
			}
			return year + "" + month + "" + day;
		},
		showMsgAccept: function() {
			var that = this;
			var oView = this.getView();
			// var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.show(
				that._oMessg, {
					icon: MessageBox.Icon.INFORMATION,
					title: "Información",
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					defaultAction: MessageBox.Action.NO,
					contentWidth: "100px",
					onClose: function(oAction) {
						if (oAction === sap.m.MessageBox.Action.YES) {
							that.validateStep(oView.byId("SolGeneralStep"));
						} else {
							that.invalidateStep(oView.byId("SolGeneralStep"));
							oView.byId("oSSolicitud").setSelectedKey("");
							that.getView().byId("BtnConf").setVisible(false);
						}
					}
				});
		},
		showMsgInfo: function() {
			var that = this;
			var oView = this.getView();
			var bCompact = !!oView.$().closest(".sapUiSizeCompact").length;
			MessageBox.show(that._oMessg, {
				icon: MessageBox.Icon.INFORMATION,
				title: "Información",
				actions: [MessageBox.Action.OK],
				styleClass: bCompact ? "sapUiSizeCompact" : "",
				contentWidth: "100px"
			});
		},
		confirmMsg: function() {
			var oModel = this.getView().getModel();
			oModel.callFunction(
				"/UpdateLogMsg", // function import name 
				{
					"method": "GET", // http method  
					"urlParameters": {
						"noSol": "31052017",
						"stobjid": "10000215",
						"tipo": "0001",
						"sede": "50000125"
					}, // function import parameters  
					"success": function(ofData, response) {}, // callback function for success  
					"error": function(oError) {
							// oOHOrden.setTitle("sin ot disponibles");
							// oSBuscarOt.setEnabled(true);
						} // callback function for error  
				});
		},
		validateStep: function(step) {
			this._wizard.validateStep(step);
		},
		invalidateStep: function(step) {
			this._wizard.invalidateStep(step);
		},
		calcTotalSol: function() {
			var that = this;
			var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance();
			var itSolicitud = sap.ui.getCore().byId("sliSolicitud");
			oCurrencyFormat.oFormatOptions.showMeasure = false;
			var ohTotal = sap.ui.getCore().byId("ohTotal");
			if (that._oSelSolicitud.length !== 0) {
				var precio	= oCurrencyFormat.format((that._oSelSolicitud[0].precio), "COP");
				var total	= oCurrencyFormat.format((that._oSelSolicitud[0].precio  * that._oSolAdic[0].cant), "COP");
				ohTotal.setNumber(total);
				itSolicitud.setTitle(that._oSelSolicitud[0].descripcion);
				itSolicitud.setInfo(precio + " COP");
			} else {
				ohTotal.setNumber("");
				itSolicitud.setTitle("");
				itSolicitud.setInfo("");
			}
		},
		goToPaymentStep: function() {
			var selectedKey = this.getView().byId("tipoSolicitudSelection").getSelectedKey();
			switch (selectedKey) {
				case "Certificados":
					this.getView().byId("TipoSolicitudStep").setNextStep(this.getView().byId("SolCertificaStep"));
					break;
				case "Generales":
					this.getView().byId("TipoSolicitudStep").setNextStep(this.getView().byId("SolGeneralStep"));
					break;
			}
		},
		setTipoSolicitud: function() {
			this.setDiscardableProperty({
				message: "Está seguro de cambiar el tipo de Solicitud?  Perderá el progreso actual.",
				discardStep: this.getView().byId("TipoSolicitudStep"),
				modelPath: "/selectedTiposol",
				historyPath: "prevPaymentSelect"
			});
		},
		setDiscardableProperty: function(params) {
			var that = this;
			if (this._wizard.getProgressStep() !== params.discardStep) {
				MessageBox.warning(params.message, {
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function(oAction) {
						if (oAction === MessageBox.Action.YES) {
							that._wizard.discardProgress(params.discardStep);
							history[params.historyPath] = that.model.getProperty(params.modelPath);
						} else {
							that.model.setProperty(params.modelPath, history[params.historyPath]);
						}
					}
				});
			} else {
				history[params.historyPath] = this.model.getProperty(params.modelPath);
			}
		},
		handleWizardCancel: function() {
			// this._handleMessageBoxOpen("Está seguro de cancelar su solicitud?", "warning");
			var that = this;
			var oView = this.getView();
			var oModel = this.oView.getModel();
			MessageBox["confirm"]("Está seguro de cancelar su solicitud", {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.YES) {
						oModel.callFunction(
							"/CancelSolicitud", // function import name 
							{
								"method": "GET", // http method  
								"urlParameters": {}, // function import parameters  
								"success": function(ofData, response) {
									that._wizard.discardProgress(that._wizard.getSteps()[0]);
									that._navBackToList();
									that.cleanControl();
								},
								"error": function(oError) {}
							});
					}
				}
			});

		},
		handleWizardSubmit: function() {
			var that = this;
			var oView = this.getView();
			var oModel = this.oView.getModel();
			var selectedKey = this.getView().byId("tipoSolicitudSelection").getSelectedKey();
			this.validateForm(selectedKey);
			MessageBox["confirm"]("Está seguro de confirmar su solicitud?", {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.YES) {
						oModel.callFunction(
							"/RegSolicitud", // function import name 
							{
								"method": "GET", // http method  
								"urlParameters": {
									"identificacion":	oView.byId("docEstudiante").getValue(),
									"sede": 			that._oSede,
									"tipo": 			that._oSelSolicitud[0].noSolicitud,
									"observaciones":	that._oSolAdic[0].observ,
									"plann":			oView.byId("oSProgramas").getSelectedItem().getKey(),
									"peryr":			oView.byId("oSAnio").getSelectedItem().getKey(),
									"perid":			oView.byId("oSPeriodo").getSelectedItem().getKey(),
									"flgmsg":			that._oFlgMsg,
									"liquida":			that._oSelSolicitud[0].liquida,
									"cantidad":			that._oSolAdic[0].cant
								}, // function import parameters  
								"success": function(ofData, response) {
									var oIcon;
									var oTitle;

									if (ofData.Tipo === 'S') {
										oIcon = MessageBox.Icon.SUCCESS;
										oTitle = "Solicitud " + ofData.Texto + " enviada con éxito";
									} else {
										oIcon = MessageBox.Icon.ERROR;
										oTitle = "Error registrando solicitud";
									}

									MessageBox.show(
										ofData.Message, {
											icon: oIcon,
											title: oTitle,
											actions: [MessageBox.Action.OK],
											contentWidth: "100px"
										});

									that._wizard.discardProgress(that._wizard.getSteps()[0]);
									that._navBackToList();
									that.cleanControl();

								}, // callback function for success  
								"error": function(oError) {
										// oOHOrden.setTitle("sin ot disponibles");
										// oSBuscarOt.setEnabled(true);
									} // callback function for error  
							});

					}
				}
			});
		},
		cleanControl: function() {
			var oView = this.getView();
			oView.byId("oSSolicitud").setSelectedKey("");
			oView.byId("oSProgramas").setSelectedKey("");
			oView.byId("oSAnio").setSelectedKey("");
			oView.byId("oSPeriodo").setSelectedKey("");
			oView.byId("idFilesTable").removeAllItems();
			oView.byId("idFilesTable").setVisible(false);
			oView.byId("BtnConf").setVisible(false);
			oView.byId("txtObserv").setValue("");
			oView.byId("txtDetAdic").setValue("");
			oView.byId("oSCertifica").setSelectedKey("");
			oView.byId("inCant").setValue("1");
			
		},
		backToWizardContent: function() {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},
		onSelect: function(selected) {
			if (this.getView().byId("rb-no").getSelected()) {
				this._wizard.invalidateStep(this.getView().byId("DatosGeneralStep"));
				MessageBox.warning(
					"Por favor actualice sus datos antes de hacer cualquier solicitud.");
				this._wizard.discardProgress(this._wizard.getSteps()[0]);
				this._navBackToList();
			} else {
				this._wizard.validateStep(this.getView().byId("DatosGeneralStep"));
			}
		},
		onSelectionChange: function() {
			this.setDiscardableProperty({
				message: "Está seguro de cambiar de Solicitud? ",
				discardStep: this.getView().byId("SolGeneralStep"),
				modelPath: "/CambioSolicitud",
				historyPath: "prevSolicitudtSelect"
			});
		},
		goToOptionStep: function() {
			if (this.getView().byId("itSolicitud").getText() === "Validaciones") {
				this.getView().byId("SolGeneralStep").setNextStep(this.getView().byId("MateriasStep"));
			} else {
				this.getView().byId("SolGeneralStep").setNextStep(this.getView().byId("ResumenStep"));
			}
		},

		completedHandler: function() {
			var selectedKey = this.getView().byId("tipoSolicitudSelection").getSelectedKey();
			this._oNavContainer.to(this._oWizardReviewPage);
			sap.ui.getCore().byId("PSolicitud").setVisible(true);
			this.validateForm(selectedKey);
			this.calcTotalSol();
		},
		// Nuevo
		validateForm: function(selectedKey) {
			var that = this;
			var oView = this.getView();
			switch (selectedKey) {
				case "Certificados":
					that._oSolAdic[0].tipo = that._oSelSolicitud[0].noSolicitud;
					that._oSolAdic[0].observ =  oView.byId("txtDetAdic").getValue();
					that._oSolAdic[0].cant =	oView.byId("inCant").getValue();
					break;
				case "Generales":
					that._oSolAdic[0].tipo = that._oSelSolicitud[0].noSolicitud;
					that._oSolAdic[0].observ =  oView.byId("txtObserv").getValue();
					that._oSolAdic[0].cant =	1;
					break;
			}
		},
		handleUploadComplete: function(oEvent) {
			var sResponse = oEvent.getParameter("response");
			var oFileUploader = this.getView().byId("fileUploader");
			var oTable = this.byId("idFilesTable");

			oFileUploader.removeAllHeaderParameters();
			if (sResponse) {
				this.showDialog("Archivo cargado satisfactoriamente");
				this.addFileRow();
				this.getView().byId("fileUploader").setValue("");
				sap.ui.core.BusyIndicator.hide();
			}
		},
		showFilesTable: function() {
			var ofilesTable = this.byId("idFilesTable");
			var oModelFiles = new sap.ui.model.json.JSONModel();
			var columnData = [{
				columnName: "Archivo",
				columnLabel: "Archivo"
			}, {
				columnName: "",
				columnLabel: ""
			}];
			var rowData = [];
			oModelFiles.setData({
				rows: rowData,
				columns: columnData
			});
			ofilesTable.setModel(oModelFiles);
			ofilesTable.bindAggregation("columns", "/columns", function(index, context) {
				return new sap.m.Column({
					header: new sap.m.Label({
						text: context.getObject().columnLabel
					}),
					demandPopin: true,
					minScreenWidth: "Tablet",
					hAlign: "Left"
				});
			});
			ofilesTable.setVisible(true);
		},
		addFileRow: function() {
			var that = this;
			var ofilesTable = this.byId("idFilesTable");
			var oModel = ofilesTable.getModel().getProperty("/rows");
			var columnData = ofilesTable.getModel().getProperty("/columns");

			var rowData = {
				fileName: this.getView().byId("fileUploader").getValue()
			};
			oModel.push(rowData);
			ofilesTable.getModel().setProperty("/rows", oModel);

			var row = new sap.m.ColumnListItem({
				demandPopin: true,
				hAlign: "Right",
				minScreenWidth: "Tablet"
			});
			row.addCell(
				new sap.m.ObjectIdentifier({
					text: this.getView().byId("fileUploader").getValue()
				})
			);
			row.addCell(
				new sap.ui.core.Icon({
					src: "sap-icon://delete",
					press: function(oEvent) {
						var item = oEvent.getSource().getParent().getId();
						var fileName = oEvent.getSource().getParent().getCells()[0].getText();
						that.getView().getModel().callFunction(
							"/RemoveFile", {
								"method": "GET", // http method  
								"urlParameters": {
									"filename": fileName
								},
								"success": function(ofData, response) {},
								"error": function(oError) {}
							});
						oEvent.getSource().getParent().getParent().removeItem(item);
					}
				})
			);
			ofilesTable.addItem(row);
		},
		handleUploadPress: function(oEvent) {
			var oFileUploader = this.getView().byId("fileUploader");
			if (oFileUploader.getValue() !== "") {
				this.getView().getModel().refreshSecurityToken();
				oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
					name: "x-csrf-token",
					value: this.getView().getModel().getHeaders()['x-csrf-token']
				}));
				oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
					name: "slug",
					value: oFileUploader.getValue()
				}));
				oFileUploader.insertHeaderParameter(new sap.ui.unified.FileUploaderParameter({
					name: "content-type",
					value: "charset=utf-8"
				}));
				sap.ui.core.BusyIndicator.show();
				this.showFilesTable();
				oFileUploader.upload();
			}
		},
		_handleMessageBoxOpen: function(sMessage, sMessageBoxType) {
			var that = this;
			var oView = this.getView();
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.YES) {
						that._wizard.discardProgress(that._wizard.getSteps()[0]);
						that._navBackToList();
						oView.byId("oSSolicitud").setSelectedKey("");
						oView.byId("oSProgramas").setSelectedKey("");
						oView.byId("oSAnio").setSelectedKey("");
						oView.byId("oSPeriodo").setSelectedKey("");
					}
				}
			});
		},
		_navBackToList: function() {
			this._navBackToStep(this.getView().byId("DatosGeneralStep"));
		},
		_navBackToTipoSolicitud: function() {
			this._navBackToStep(this.getView().byId("TipoSolicitudStep"));
		},
		_navBackToSolGeneral: function() {
			this._navBackToStep(this.getView().byId("SolGeneralStep"));
		},
		_navBackToStep: function(step) {
			var that = this;

			function fnAfterNavigate() {
				that._wizard.goToStep(step);
				that._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this._oNavContainer.to(this._oWizardContentPage);
		}
	});

	return WizardController;
});