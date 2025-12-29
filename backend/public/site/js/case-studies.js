/**
 * Case Studies Modal Functionality
 * Handles the "Groundbreaking Projects" section modals
 */

// Case study data for modal display
var csData = {
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

// Open case study modal
function openCsModal(id) {
  var data = csData[id];
  if (!data) return;
  
  var modal = document.getElementById('csModal');
  if (!modal) return;
  
  var html = '<button class="cs-modal-close">&times;</button>' +
    '<div class="cs-modal-header">' +
    '<span class="cs-modal-badge">' + data.category + '</span>' +
    '<h2 class="cs-modal-title">' + data.title + '</h2>' +
  '</div>' +
  '<div class="cs-modal-body">' +
    '<blockquote class="cs-modal-quote">"' + data.quote + '"</blockquote>' +
    '<div class="cs-modal-section"><h4><span class="icon"><i class="fa-solid fa-flag"></i></span>The Challenge</h4><p>' + data.challenge + '</p></div>' +
    '<div class="cs-modal-section"><h4><span class="icon"><i class="fa-solid fa-lightbulb"></i></span>The Solution</h4><p>' + data.solution + '</p></div>' +
    '<div class="cs-modal-section"><h4><span class="icon"><i class="fa-solid fa-trophy"></i></span>The Result</h4><p>' + data.result + '</p></div>' +
  '</div>' +
  '<div class="cs-modal-footer"><a href="/contact" class="vl-btn3">Start Your Success Story</a></div>';
  
  document.getElementById('csModalContent').innerHTML = html;
  modal.style.display = 'block';
  setTimeout(function() { modal.classList.add('show'); }, 10);
  document.body.style.overflow = 'hidden';
}

// Close case study modal
function closeCsModal() {
  var modal = document.getElementById('csModal');
  if (!modal) return;
  
  modal.classList.remove('show');
  setTimeout(function() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }, 300);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Intercept case study link clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="/case-study/"]');
    if (link) {
      e.preventDefault();
      var id = parseInt(link.getAttribute('href').split('/').pop(), 10);
      openCsModal(id);
    }
    
    // Handle close button clicks (CSP blocks inline onclick handlers)
    var closeBtn = e.target.closest('.cs-modal-close');
    if (closeBtn) {
      e.preventDefault();
      closeCsModal();
    }
  });

  // Close on overlay click
  var modal = document.getElementById('csModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeCsModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('csModal');
      if (modal && modal.style.display === 'block') {
        closeCsModal();
      }
    }
  });
});
