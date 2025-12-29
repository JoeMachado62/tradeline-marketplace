import { Router, Request, Response } from "express";

const router = Router();

// Home page (using index3 design as requested)
router.get("/", (_req: Request, res: Response) => {
    res.render("index3", {
        title: "TradelineRental.com - Boost Your Credit Score Fast",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="body-bg3"',
        extra_css: "",
        currentPath: "/"
    });
});

// About page
router.get("/about", (_req: Request, res: Response) => {
    res.render("about", {
        title: "About Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        currentPath: "/about"
    });
});

// Services page
router.get("/service", (_req: Request, res: Response) => {
    res.render("service", {
        title: "Our Services | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: "",
        currentPath: "/service"
    });
});

// Contact page
router.get("/contact", (_req: Request, res: Response) => {
    res.render("contact", {
        title: "Contact Us | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        currentPath: "/contact"
    });
});

// Broker Channel page
router.get("/broker", (_req: Request, res: Response) => {
    res.render("broker", {
        title: "Broker Program | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: 'class="inner-page-3"',
        extra_css: "",
        currentPath: "/broker"
    });
});

// Inventory / Pricing page (where we can embed the widget later)
router.get("/inventory", (_req: Request, res: Response) => {
    res.render("pricing", {
        title: "Tradeline Inventory | TradelineRental.com",
        html_attribute: 'class="no-js"',
        body_attribute: "",
        extra_css: '<link rel="stylesheet" href="/widget/tradeline-widget.css"><style>#tradeline-widget{min-height:600px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.05);padding:20px;margin-top:30px;}.inner-pages-section-area{padding:100px 0;}</style>',
        currentPath: "/inventory"
    });
});

// Case Study Data
const caseStudies: { [key: number]: any } = {
    1: {
        category: "Partner Success",
        title: "The $250k Leap: A Partner's Triumph",
        quote: "We were losing opportunities not because of ability, but because of access.",
        challenge: "Credit Services LLC was at a crossroads. A promising construction client needed a $250,000 line of credit to bid on a lucrative municipal contract. The client had the cash flow, but their credit file was thin, limiting their bank approval to a mere $25,000. The rejection threatened to stall the client's growth and damage the partner's reputation.",
        solution: "They turned to our \"Credit Ladder\" strategy. By strategically layering three high-limit, aged authorized user tradelines, we instantly increased the client's average age of accounts and drastically lowered their utilization ratio overnight.",
        result: "A credit rescore within 35 days unlocked the full $250,000 credit line. The client won the municipal contract, and Credit Services LLC cemented a loyal, high-value partnership for years to come."
    },
    2: {
        category: "Mortgage Approval",
        title: "Saving the Dream Home: A Mortgage Victory",
        quote: "We had the boxes packed. Losing this house wasn't an option.",
        challenge: "James and Elena found their dream home—a 4-bedroom colonial in a perfect school district. But joy turned to panic when the underwriter flagged a recent utilization spike, dropping James's middle score to 618, just two points below the cutoff. Closing was in 3 weeks.",
        solution: "Enter Credolosit, a broker partner who knew exactly what to do. Utilizing our \"Rapid Dilution\" method, we added a $50,000 limit primary line with 0% utilization. The impact was mathematical and immediate: the new limit diluted their overall utilization ratio from 45% to 12%.",
        result: "When the credit report was pulled again 21 days later, James's score had surged 60 points to 678. They didn't just get approved; they secured a prime interest rate, saving them over $300 a month for the next 30 years."
    },
    3: {
        category: "Startup Funding",
        title: "From Bootstrapped to Bankrolled",
        quote: "She refused to dilute her equity. She just needed the banks to believe in her.",
        challenge: "Fundalytics, a burgeoning AI analytics firm, was stuck in the \"valley of death\". They had a working prototype and eager beta users, but no capital to scale server capacity. Managing Director Sarah needed business credit, but without personal assets to pledge as collateral, traditional banks were saying no.",
        solution: "We implemented our Corporate Credit Scaffolding™ program. By establishing Tier 1 vendor lines and graduating to revolving Tier 2 accounts, we built a robust Data Universal Numbering System (DUNS) profile from scratch.",
        result: "In just four months, Fundalytics secured $50,000 in unsecured business credit cards and a $100,000 equipment lease—all without a personal guarantee. They scaled, launched, and eventually raised a Series A on their terms."
    },
    4: {
        category: "Credit Repair",
        title: "The Comeback Kid: Bankruptcy to 710",
        quote: "I felt like a second-class citizen using debit for everything.",
        challenge: "Seven years ago, Mark lost his restaurant business and filed for Chapter 7 bankruptcy. The financial stigma felt permanent. He came to us with a sub-500 score and a simple goal: to buy a reliable car without a predatory 20% interest rate.",
        solution: "We designed a 6-month \"Rehabilitation Roadmap\". It started with secured primaries to establish positive payment history, followed by the addition of two 5-year aged authorized user lines to add weight and history.",
        result: "To Mark's disbelief, his score didn't just inch up; it catapulted. By month five, he hit 710—a \"good\" rating by any standard. He drove off the lot in a new Toyota Tacoma with a 4.5% APR, proving that your past doesn't have to dictate your financial future."
    },
    5: {
        category: "Consumer Success",
        title: "Breaking the 'Thin File' Barrier",
        quote: "She had zero debt and perfect rent payments. But to the bank, she didn't exist.",
        challenge: "Emily, a 26-year-old freelance graphic designer, had always been responsible. She paid rent on time, bought her phone outright, and lived debt-free. But when she walked into a bank to apply for her first mortgage, she was rejected. The reason? A \"thin file\".",
        solution: "She was devastated. We stepped in with our \"Instant History\" solution, adding a 15-year aged tradeline with perfect payment history to her file. It acted like a time machine for her credit report.",
        result: "When lenders re-pulled her file 30 days later, they saw over a decade of positive \"data\". Emily qualified for an FHA loan instantly and closed on her first condo just six weeks later."
    }
};

// Case Study Pages
router.get("/case-study/:id", (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const caseStudy = caseStudies[id];
    
    if (!caseStudy) {
        return res.status(404).render("404", {
            title: "Case Study Not Found | TradelineRental.com",
            html_attribute: 'class="no-js"',
            body_attribute: "",
            extra_css: ""
        });
    }
    
    res.render("case-study", {
        title: `${caseStudy.title} | TradelineRental.com`,
        html_attribute: 'class="no-js"',
        body_attribute: 'class="body-bg3"',
        extra_css: "",
        caseStudy: caseStudy
    });
});

export default router;
