// @ts-check
/**
 * @file src/props/industrial.js
 * @description 港区工业资产聚合网关 (Industrial Props Gateway Facade)
 *
 * 【架构解耦说明】
 * 本文件作为向下兼容的聚合网关，将原本超过 1,600 行的单体文件细粒度解耦为两大高内聚子系统：
 * 1. cargo.js: 仓储物流与散货资产 (油桶、托盘、木箱、吨桶、电缆盘、废旧轮胎、油壶、路锥、气瓶、钢管、货堆、沙袋、纸箱)
 * 2. machinery.js: 重型机械、特种车辆与维保设备 (平衡重叉车、柴油发电机组、工业垃圾箱、机修工具车)
 */

export * from "./cargo.js";
export * from "./machinery.js";
