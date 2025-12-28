"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Home page (using index3 design as requested)
router.get("/", (_req, res) => {
    res.render("index3", {
        title: "TradelineRental.com - Boost Your Credit Score Fast",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="body-bg3"',
        extra_css: "",
        extra_javascript: ""
    });
});
// About page
router.get("/about", (_req, res) => {
    res.render("about", {
        title: "About Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});
// Services page
router.get("/service", (_req, res) => {
    res.render("service", {
        title: "Our Services | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});
// Contact page
router.get("/contact", (_req, res) => {
    res.render("contact", {
        title: "Contact Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        extra_javascript: ""
    });
});
// Broker Channel page
router.get("/broker", (_req, res) => {
    res.render("broker", {
        title: "Broker Program | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        extra_javascript: ""
    });
});
// Inventory / Pricing page (where we can embed the widget later)
router.get("/inventory", (_req, res) => {
    res.render("pricing", {
        title: "Tradeline Inventory | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});
exports.default = router;
//# sourceMappingURL=site.js.map