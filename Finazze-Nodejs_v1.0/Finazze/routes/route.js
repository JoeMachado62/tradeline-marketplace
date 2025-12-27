
const express = require('express');
const route = express.Router();

route.get('/', (req, res, next) => {
  res.render('index');
})


route.get('/404', (req, res, next) => {
  res.render('404');
})

route.get('/about', (req, res, next) => {
  res.render('about');
})

route.get('/blog-left', (req, res, next) => {
  res.render('blog-left');
})

route.get('/blog-right', (req, res, next) => {
  res.render('blog-right');
})

route.get('/blog-single', (req, res, next) => {
  res.render('blog-single');
})

route.get('/blog', (req, res, next) => {
  res.render('blog');
})

route.get('/contact', (req, res, next) => {
  res.render('contact');
})

route.get('/faq', (req, res, next) => {
  res.render('faq');
})

route.get('/index', (req, res, next) => {
  res.render('index');
})

route.get('/index2', (req, res, next) => {
  res.render('index2', {layout: 'partials/base'});
})

route.get('/index3', (req, res, next) => {
  res.render('index3', {layout: 'partials/base'});
})

route.get('/index4', (req, res, next) => {
  res.render('index4', {layout: 'partials/base'});
})

route.get('/index5', (req, res, next) => {
  res.render('index5', {layout: 'partials/base'});
})

route.get('/pricing', (req, res, next) => {
  res.render('pricing');
})

route.get('/project-left', (req, res, next) => {
  res.render('project-left');
})

route.get('/project-right', (req, res, next) => {
  res.render('project-right');
})

route.get('/project-single', (req, res, next) => {
  res.render('project-single');
})

route.get('/project', (req, res, next) => {
  res.render('project');
})

route.get('/service-left', (req, res, next) => {
  res.render('service-left');
})

route.get('/service-right', (req, res, next) => {
  res.render('service-right');
})

route.get('/service-single', (req, res, next) => {
  res.render('service-single');
})

route.get('/service', (req, res, next) => {
  res.render('service');
})

route.get('/team', (req, res, next) => {
  res.render('team');
})

route.get('/testimonial', (req, res, next) => {
  res.render('testimonial');
})

module.exports = route