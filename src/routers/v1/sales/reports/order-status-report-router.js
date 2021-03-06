var Router = require('restify-router').Router;
var db = require("../../../../db");
var ProductionOrderManager = require("dl-module").managers.sales.ProductionOrderManager;
var resultFormatter = require("../../../../result-formatter");
var passport = require('../../../../passports/jwt-passport');
const apiVersion = '1.0.0';

function getRouter() {

    var defaultOrder = {
        "_updatedDate": -1
    };

    var getManager = (user) => {
        return db.get()
            .then((db) => {
                return Promise.resolve(new ProductionOrderManager(db, user));
            });
    };

    var router = new Router();

    router.get("/", passport, function (request, response, next) {
        var user = request.user;
        var query = request.query;
        query.order = Object.assign({}, defaultOrder, query.order);

        var productionOrderManager = {};
        getManager(user)
            .then((manager) => {
                productionOrderManager = manager;
                return productionOrderManager.getOrderStatusReport(query, request.timezoneOffset);
            })
            .then((data) => {
                var result = resultFormatter.ok(apiVersion, 200, data);
                return Promise.resolve(result);
            })
            .then((result) => {
                if ((request.headers.accept || '').toString().indexOf("application/xls") < 0) {
                    response.send(result.statusCode, result);
                }
                else {
                    productionOrderManager.getOrderStatusXls(result, query)
                        .then((xls) => {
                            response.xls(xls.name, xls.data, xls.options)
                        });
                }
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    router.get("/:year/:month/:orderType", passport, function (request, response, next) {
        var user = request.user;
        var query = request.query;
        query.order = Object.assign({}, defaultOrder, query.order);

        var productionOrderManager = {};
        getManager(user)
            .then((manager) => {
                productionOrderManager = manager;
                return productionOrderManager.getOrderStatusDetailReport(request.params, request.timezoneOffset);
            })
            .then((data) => {
                var result = resultFormatter.ok(apiVersion, 200, data);
                return Promise.resolve(result);
            })
            .then((result) => {
                if ((request.headers.accept || '').toString().indexOf("application/xls") < 0) {
                    response.send(result.statusCode, result);
                }
                else {
                    productionOrderManager.getOrderStatusDetailXls(result, request.params, request.timezoneOffset)
                        .then((xls) => {
                            response.xls(xls.name, xls.data, xls.options)
                        });
                }
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    router.get("/:orderNo", passport, function (request, response, next) {
        var user = request.user;
        var query = request.query;
        query.order = Object.assign({}, defaultOrder, query.order);

        var productionOrderManager = {};
        getManager(user)
            .then((manager) => {
                productionOrderManager = manager;
                return productionOrderManager.getOrderStatusKanbanDetailReport(request.params);
            })
            .then((data) => {
                var result = resultFormatter.ok(apiVersion, 200, data);
                return Promise.resolve(result);
            })
            .then((result) => {
                if ((request.headers.accept || '').toString().indexOf("application/xls") < 0) {
                    response.send(result.statusCode, result);
                }
                else {
                    productionOrderManager.getOrderStatusKanbanDetailXls(result, request.params, request.timezoneOffset)
                        .then((xls) => {
                            let XLSX = require('xlsx');
                            let wb = XLSX.utils.book_new;
                            wb.SheetNames = ["Laporan Status Order Kanban", "Histories"];
                            wb.Sheets = {};

                            let ws = XLSX.utils.json_to_sheet(xls.data);
                            let wsHistory = XLSX.utils.json_to_sheet(xls.histories);
                            wb.Sheets["Laporan Status Order Kanban"] = ws;
                            wb.Sheets["Histories"] = wsHistory;

                            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                            response.setHeader('Content-Type', 'application/vnd.openxmlformats');
                            response.setHeader("Content-Disposition", "attachment; filename=" + xls.name);

                            response.send(new Buffer(wbout));
                        });
                }
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    return router;
}

module.exports = getRouter;