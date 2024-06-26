/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { FC } from 'react';
import ActivityFeedImg from '../assets/img/activity-feed.png';
import AnnouncementImg from '../assets/img/announcement.png';
import FollowingImg from '../assets/img/following.png';
import KPISmallImg from '../assets/img/kpi-small.png';
import KPIImg from '../assets/img/kpi.png';
import MyDataImg from '../assets/img/my-data.png';
import RecentViewsImg from '../assets/img/recent-views.png';
import TotalAssetsMediumImg from '../assets/img/total-assets-medium.png';
import TotalAssetsImg from '../assets/img/total-assets.png';
import { MyDataWidget } from '../components/MyData/MyDataWidget/MyDataWidget.component';
import AnnouncementsWidget, {
  AnnouncementsWidgetProps,
} from '../components/MyData/RightSidebar/AnnouncementsWidget';
import FollowingWidget, {
  FollowingWidgetProps,
} from '../components/MyData/RightSidebar/FollowingWidget';
import FeedsWidget from '../components/MyData/Widgets/FeedsWidget/FeedsWidget.component';
import KPIWidget from '../components/MyData/Widgets/KPIWidget/KPIWidget.component';
import RecentlyViewed from '../components/MyData/Widgets/RecentlyViewed/RecentlyViewed';
import TotalDataAssetsWidget from '../components/MyData/Widgets/TotalDataAssetsWidget/TotalDataAssetsWidget.component';
import {
  LandingPageWidgetKeys,
  WidgetWidths,
} from '../enums/CustomizablePage.enum';
import {
  WidgetCommonProps,
  WidgetConfig,
} from '../pages/CustomizablePage/CustomizablePage.interface';

class CustomizePageClassBase {
  defaultWidgetHeight = 3;
  landingPageWidgetMargin = 16;
  landingPageRowHeight = 100;
  landingPageMaxGridSize = 3;

  landingPageWidgetDefaultHeights: Record<string, number> = {
    activityFeed: 6,
    announcements: 3,
    following: 3,
    recentlyViewed: 3,
    myData: 3,
    kpi: 3,
    totalAssets: 3,
  };

  announcementWidget: WidgetConfig = {
    h: this.landingPageWidgetDefaultHeights.announcements,
    i: LandingPageWidgetKeys.ANNOUNCEMENTS,
    w: 1,
    x: 3,
    y: 0,
    static: true, // Making announcement widget fixed on top right position
  };

  defaultLayout: Array<WidgetConfig> = [
    {
      h: this.landingPageWidgetDefaultHeights.activityFeed,
      i: LandingPageWidgetKeys.ACTIVITY_FEED,
      w: 3,
      x: 0,
      y: 0,
      static: false,
    },
    {
      h: this.landingPageWidgetDefaultHeights.myData,
      i: LandingPageWidgetKeys.MY_DATA,
      w: 1,
      x: 0,
      y: 6,
      static: false,
    },
    {
      h: this.landingPageWidgetDefaultHeights.kpi,
      i: LandingPageWidgetKeys.KPI,
      w: 2,
      x: 1,
      y: 6,
      static: false,
    },
    {
      h: this.landingPageWidgetDefaultHeights.totalAssets,
      i: LandingPageWidgetKeys.TOTAL_DATA_ASSETS,
      w: 3,
      x: 0,
      y: 9,
      static: false,
    },
    {
      h: this.landingPageWidgetDefaultHeights.following,
      i: LandingPageWidgetKeys.FOLLOWING,
      w: 1,
      x: 3,
      y: 1.5,
      static: false,
    },
    {
      h: this.landingPageWidgetDefaultHeights.recentlyViewed,
      i: LandingPageWidgetKeys.RECENTLY_VIEWED,
      w: 1,
      x: 3,
      y: 3,
      static: false,
    },
  ];

  protected updateDefaultLayoutLayout(layout: Array<WidgetConfig>) {
    this.defaultLayout = layout;
  }

  protected updateLandingPageWidgetDefaultHeights(obj: Record<string, number>) {
    this.landingPageWidgetDefaultHeights = obj;
  }

  /**
   *
   * @param string widgetKey
   * @returns React.FC<
    {
      isEditView?: boolean;
      widgetKey: string;
      handleRemoveWidget?: (widgetKey: string) => void;
      announcements: Thread[];
      followedData: EntityReference[];
      followedDataCount: number;
      isLoadingOwnedData: boolean;
    }
  >
   */
  public getWidgetsFromKey(
    widgetKey: string
  ): FC<WidgetCommonProps & AnnouncementsWidgetProps & FollowingWidgetProps> {
    if (widgetKey.startsWith(LandingPageWidgetKeys.ACTIVITY_FEED)) {
      return FeedsWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.MY_DATA)) {
      return MyDataWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.KPI)) {
      return KPIWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.TOTAL_DATA_ASSETS)) {
      return TotalDataAssetsWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.ANNOUNCEMENTS)) {
      return AnnouncementsWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.FOLLOWING)) {
      return FollowingWidget;
    }
    if (widgetKey.startsWith(LandingPageWidgetKeys.RECENTLY_VIEWED)) {
      return RecentlyViewed;
    }

    return (() => null) as React.FC;
  }

  public getWidgetImageFromKey(widgetKey: string, size?: number): string {
    switch (widgetKey) {
      case LandingPageWidgetKeys.ACTIVITY_FEED: {
        return ActivityFeedImg;
      }
      case LandingPageWidgetKeys.MY_DATA: {
        return MyDataImg;
      }
      case LandingPageWidgetKeys.KPI: {
        if (size === WidgetWidths.small) {
          return KPISmallImg;
        }

        return KPIImg;
      }
      case LandingPageWidgetKeys.TOTAL_DATA_ASSETS: {
        if (size === WidgetWidths.medium) {
          return TotalAssetsMediumImg;
        }

        return TotalAssetsImg;
      }
      case LandingPageWidgetKeys.ANNOUNCEMENTS: {
        return AnnouncementImg;
      }
      case LandingPageWidgetKeys.FOLLOWING: {
        return FollowingImg;
      }
      case LandingPageWidgetKeys.RECENTLY_VIEWED: {
        return RecentViewsImg;
      }
      default: {
        return '';
      }
    }
  }

  public getWidgetHeight(widgetName: string) {
    switch (widgetName) {
      case 'ActivityFeed':
        return this.landingPageWidgetDefaultHeights.activityFeed;
      case 'Announcements':
        return this.landingPageWidgetDefaultHeights.announcements;
      case 'Following':
        return this.landingPageWidgetDefaultHeights.following;
      case 'RecentlyViewed':
        return this.landingPageWidgetDefaultHeights.recentlyViewed;
      case 'MyData':
        return this.landingPageWidgetDefaultHeights.myData;
      case 'KPI':
        return this.landingPageWidgetDefaultHeights.kpi;
      case 'TotalAssets':
        return this.landingPageWidgetDefaultHeights.totalAssets;
      default:
        return this.defaultWidgetHeight;
    }
  }
}

const customizePageClassBase = new CustomizePageClassBase();

export default customizePageClassBase;
export { CustomizePageClassBase };
