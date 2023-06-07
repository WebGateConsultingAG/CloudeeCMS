# sitemap.xml generator lamdba

This lambda function is optional, a sitemap.xml generator is already present in the CloudeeCMS UI.
To use the built-in sitemap generator, add a new feed in the "Settings" page and select "Sitemap" as type. You can then use "Publish feeds.." in the Publication Queue page to update the sitemap file.
https://www.cloudee-cms.com/documentation#!/doc/settings-feeds


You can also add this lambda function as cron job via CloudWatch to run daily, if you want to have your sitemap.xml updated automatically.
(05 0 * * ? *)

Please note that sitemap.xml is no longer considered necessary for SEO.
