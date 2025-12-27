import { Router, Request, Response } from "express";

const router = Router();

// Home page (using index3 design as requested)
router.get("/", (_req: Request, res: Response) => {
    res.render("index3", {
        title: "TradelineRental.com - Boost Your Credit Score Fast",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="body-bg3"',
        extra_css: "",
        extra_javascript: ""
    });
});

// About page
router.get("/about", (_req: Request, res: Response) => {
    res.render("about", {
        title: "About Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});

// Services page
router.get("/service", (_req: Request, res: Response) => {
    res.render("service", {
        title: "Our Services | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});

// Contact page
router.get("/contact", (_req: Request, res: Response) => {
    res.render("contact", {
        title: "Contact Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        extra_javascript: ""
    });
});

// Broker Channel page
router.get("/broker", (_req: Request, res: Response) => {
    res.render("broker", {
        title: "Broker Program | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        extra_javascript: ""
    });
});

// Inventory / Pricing page (where we can embed the widget later)
router.get("/inventory", (_req: Request, res: Response) => {
    res.render("pricing", {
        title: "Tradeline Inventory | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        extra_javascript: ""
    });
});

export default router;
