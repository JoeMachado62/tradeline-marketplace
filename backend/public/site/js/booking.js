/**
 * Booking Modal Functionality
 * Handles the GoHighLevel calendar booking popup for high-intent actions
 */

// Open booking modal
function openBookingModal() {
  var modal = document.getElementById('bookingModal');
  if (!modal) return;
  
  modal.style.display = 'block';
  setTimeout(function() { modal.classList.add('show'); }, 10);
  document.body.style.overflow = 'hidden';
}

// Close booking modal
function closeBookingModal() {
  var modal = document.getElementById('bookingModal');
  if (!modal) return;
  
  modal.classList.remove('show');
  setTimeout(function() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }, 300);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  
  // Handle clicks on high-intent links
  document.addEventListener('click', function(e) {
    
    // Close button for booking modal
    var closeBtn = e.target.closest('.booking-modal-close');
    if (closeBtn) {
      e.preventDefault();
      closeBookingModal();
      return;
    }
    
    // Check for explicit booking trigger class
    var bookingTrigger = e.target.closest('.book-call-trigger');
    if (bookingTrigger) {
      e.preventDefault();
      openBookingModal();
      return;
    }
    
    // Check for "Book a Call" links (by text content)
    var link = e.target.closest('a');
    if (link) {
      var linkText = link.textContent.trim().toLowerCase();
      
      // Match "Book a Call" links
      if (linkText.includes('book a call') || linkText.includes('book call')) {
        e.preventDefault();
        openBookingModal();
        return;
      }
      
      // Match "Get Started" links on pricing/service pages
      if (link.classList.contains('readmore') && linkText.includes('get started')) {
        e.preventDefault();
        openBookingModal();
        return;
      }
    }
  });

  // Close on overlay click
  var modal = document.getElementById('bookingModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeBookingModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('bookingModal');
      if (modal && modal.style.display === 'block') {
        closeBookingModal();
      }
    }
  });
});
